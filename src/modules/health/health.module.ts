import {Module} from '@nestjs/common';
import {HealthController} from './health.controller';
import {AwsModule} from '../../infrastructure/aws/aws.module';

@Module({
    imports: [AwsModule],
    controllers: [HealthController],
})
export class HealthModule {
}
