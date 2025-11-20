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
            stopAtFirstError: this.options.stopAtFirstError ?? false,
            validationError: {target: false},
        });

        if (errors.length > 0) {
            const details = errors.map((e: CvError) => ({
                property: e.property,
                constraints: e.constraints,
            }));

            // Prefer the most helpful constraint message (e.g., isInt over min/max when value isn't a number)
            const pickConstraintMessage = (e: CvError): string | undefined => {
                const constraints = e.constraints || {};
                const priority = [
                    'isDefined',
                    'isInt',
                    'isNumber',
                    'isUUID',
                    'isBoolean',
                    'isString',
                    'min',
                    'max',
                    'whitelistValidation',
                ];
                for (const key of priority) {
                    if (constraints[key]) return constraints[key];
                }
                const firstValue = Object.values(constraints)[0];
                return firstValue as string | undefined;
            };

            const first = errors[0];
            const chosenMsg = pickConstraintMessage(first);
            const friendly = chosenMsg
                ? `Validation failed for '${first.property}': ${chosenMsg}`
                : first?.property
                    ? `Validation failed for '${first.property}'`
                    : 'Validation failed';

            throw new ValidationError(friendly, details);
        }

        return instance;
    }
}
