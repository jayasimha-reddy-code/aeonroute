import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 30000,
    retries: 1,
    snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
    expect: {
        toHaveScreenshot: {
            maxDiffPixelRatio: 0.01,
            threshold: 0.2,
        },
    },
    use: {
        baseURL: 'http://localhost:5173',
        headless: true,
        screenshot: 'only-on-failure',
        viewport: { width: 1280, height: 720 },
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: 'npm run dev',
        port: 5173,
        reuseExistingServer: true,
    },
});
