import { createWorkerHealthSnapshot, getWorkerRuntimeConfig } from "./runtime";

async function bootstrap(): Promise<void> {
	const runtimeConfig = getWorkerRuntimeConfig();
	const healthSnapshot = createWorkerHealthSnapshot(runtimeConfig);

	console.log(
		`[worker] bootstrapped queue=${healthSnapshot.queueName} concurrency=${healthSnapshot.concurrency}`
	);

	const shutdown = (signal: string) => {
		console.log(`[worker] shutdown signal received: ${signal}`);
		process.exit(0);
	};

	process.on("SIGINT", () => shutdown("SIGINT"));
	process.on("SIGTERM", () => shutdown("SIGTERM"));
}

void bootstrap();
