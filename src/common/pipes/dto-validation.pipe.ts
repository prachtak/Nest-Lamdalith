import {Injectable, PipeTransform} from '@nestjs/common';
import {plainToInstance} from 'class-transformer';
import {validate, ValidationError as CvError} from 'class-validator';
import {ValidationError} from '../../application/errors/AppError';

type ClassConstructor<T> = new (...args: any[]) => T;

/**
 * DTO validation pipe that does NOT rely on TypeScript reflection metadata.
 * Useful in environments where bundlers (e.g., esbuild) strip design:paramtypes
 * and Nest's global ValidationPipe receives `Object` instead of the DTO class.
 */
@Injectable()
export class DtoValidationPipe<T> implements PipeTransform<any, Promise<T>> {
    constructor(
        private readonly dtoClass: ClassConstructor<T>,
        private readonly options: {
            whitelist?: boolean;
            forbidNonWhitelisted?: boolean;
            stopAtFirstError?: boolean;
            enableImplicitConversion?: boolean;
        } = {}
    ) {
    }

    async transform(value: any): Promise<T> {
        // Convert plain body to DTO instance with optional implicit conversion
        const instance = plainToInstance(this.dtoClass, value, {
            enableImplicitConversion: this.options.enableImplicitConversion ?? true,
        });

        // Validate using class-validator with Nest-like defaults
        const errors = await validate(instance as any, {
            whitelist: this.options.whitelist ?? true,
            forbidNonWhitelisted: this.options.forbidNonWhitelisted ?? true,
            stopAtFirstError: this.options.stopAtFirstError ?? true,
            validationError: {target: false},
        });

        if (errors.length > 0) {
            const details = errors.map((e: CvError) => ({
                property: e.property,
                constraints: e.constraints,
            }));
            throw new ValidationError('Validation failed', details);
        }

        return instance;
    }
}
