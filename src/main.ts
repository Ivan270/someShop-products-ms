import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';
import {Logger, ValidationPipe} from "@nestjs/common";
import {envs} from "./config";
import {MicroserviceOptions, Transport} from "@nestjs/microservices";



async function bootstrap() {
    const logger = new Logger('Main')
    const app = await NestFactory.createMicroservice<MicroserviceOptions>(
        AppModule,
        // segundo parametro es la configuracion de microservicio
        {
            transport: Transport.TCP,
            // puerto donde escuchará la aplicación
            options: {
                port: envs.port
            }
        }
    );
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
        })
    )
    await app.listen();
    logger.log(`Products Microservice running on port ${envs.port}`);
}

bootstrap();
