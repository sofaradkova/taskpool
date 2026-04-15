import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

const jaegerEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://jaeger:4318";

const sdk = new NodeSDK({
  serviceName: "taskpool-api",
  traceExporter: new OTLPTraceExporter({
    url: `${jaegerEndpoint}/v1/traces`,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Cuts noise — file system and DNS spans aren't useful here
      "@opentelemetry/instrumentation-fs": { enabled: false },
      "@opentelemetry/instrumentation-dns": { enabled: false },
    }),
  ],
});

sdk.start();
console.log(`OpenTelemetry: exporting traces to ${jaegerEndpoint}`);

process.on("SIGTERM", () => {
  sdk.shutdown().finally(() => process.exit(0));
});
