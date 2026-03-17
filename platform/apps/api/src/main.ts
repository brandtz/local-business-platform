import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { getApiRuntimeConfig } from "./runtime-config";

async function bootstrap(): Promise<void> {
	const runtimeConfig = getApiRuntimeConfig();
	const app = await NestFactory.create(AppModule);

	await app.listen(runtimeConfig.port, runtimeConfig.host);
	Logger.log(
		`API listening on http://${runtimeConfig.host}:${runtimeConfig.port}`,
		"ApiBootstrap"
	);
}

void bootstrap();
