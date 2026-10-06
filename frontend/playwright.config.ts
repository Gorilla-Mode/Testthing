import { defineConfig } from '@playwright/test';

const frontendDev = process.env.FRONTEND_DEV === '1';

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  use: {
    baseURL: 'http://localhost:18080',
    browserName: 'chromium',
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    ...(frontendDev ? [{
      command: 'npm run dev', url: 'http://localhost:5173/@vite/client', timeout: 30_000, reuseExistingServer: false,
    }] : []),
    {
      command: `../gradlew -p .. bootRun --args=--server.port=18080${frontendDev ? ' -PfrontendDev' : ''}`,
      url: 'http://localhost:18080',
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
});
