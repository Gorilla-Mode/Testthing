import { defineConfig } from '@playwright/test';

const frontendDev = process.env.FRONTEND_DEV === '1';
const externalBaseURL = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  use: {
    baseURL: externalBaseURL || (frontendDev ? 'http://localhost:5173' : 'http://localhost:18080'),
    browserName: 'chromium',
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: externalBaseURL ? undefined : [
    {
      command: frontendDev
        ? '../gradlew -p .. bootRun -PfrontendDev --args=--server.port=18080'
        : '../gradlew -p .. bootJar && java -jar ../build/libs/demo-0.0.1-SNAPSHOT.jar --server.port=18080',
      url: 'http://localhost:18080/web/map',
      timeout: 120_000,
      reuseExistingServer: false,
    },
    ...(frontendDev ? [{
      command: 'npm run dev',
      env: { API_PROXY_TARGET: 'http://localhost:18080' },
      url: 'http://localhost:5173', timeout: 30_000, reuseExistingServer: false,
    }] : []),
  ],
});
