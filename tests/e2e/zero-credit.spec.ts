import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const TEST_PDF_PATH = path.join(__dirname, 'fixtures', 'zero-credit-test-doc.pdf');

test.beforeAll(async () => {
    // Ensure fixture directory exists
    const fixtureDir = path.dirname(TEST_PDF_PATH);
    if (!fs.existsSync(fixtureDir)) {
        fs.mkdirSync(fixtureDir, { recursive: true });
    }

    // Generate a dummy PDF (around 1KB text)
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    page.drawText('Zero Credit Test Document.\nThis text verifies the parsing and mocked pipeline.\nWe expect to see fake embeddings and fake AI generation.');
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(TEST_PDF_PATH, pdfBytes);
});

test.describe('Ragie-Lite Zero-Credit Flow', () => {
    test('should execute full pipeline using mocked AI and WASM', async ({ page }) => {
        // We set NEXT_PUBLIC_MOCK_AI=true MOCK_AI=true in package.json

        test.setTimeout(60000); // Should be much faster since no real models are downloading

        // 1. Load Homepage
        await page.goto('/');
        await expect(page).toHaveTitle(/Ragie-Lite/);

        // 2. Stage A: Upload Mock PDF
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(TEST_PDF_PATH);

        // 3. Stage B: Verify Chunking Studio appears
        await expect(page.getByText('Pipeline Config')).toBeVisible();
        await expect(page.getByText(/Zero Credit Test Document/)).toBeVisible({ timeout: 10000 });

        // Wait for generated chunks text
        const chunkElements = page.getByText(/ID: /);
        await expect(chunkElements).not.toHaveCount(0);

        // 4. Stage C: Indexing (Mocked WASM)
        const vectorButton = page.getByRole('button', { name: /Start Embedding Process/i });
        await expect(vectorButton).toBeEnabled();
        await vectorButton.click();

        // It should complete very quickly because we mocked the Transformers.js pipeline
        // Stage D query input should become enabled
        const queryInput = page.getByPlaceholder('Ask a question about the document...');
        await expect(queryInput).toBeEnabled({ timeout: 10000 });

        // 5. Stage D: Retrieval
        await queryInput.fill('What is this test about?');
        const searchButton = page.getByRole('button', { name: /Search/i });
        await expect(searchButton).toBeEnabled();
        await searchButton.click();

        // 6. Stage E: Generation (Mocked Gemini)
        const generateButton = page.getByRole('button', { name: /Generate Answer/i });
        await expect(generateButton).toBeVisible({ timeout: 5000 });
        await generateButton.click();

        // Verify Mocked Answer
        // mock response is "This is a mocked AI response."
        const answerContainer = page.locator('.prose-indigo');
        await expect(answerContainer).toContainText(/This is a mocked AI response/i, { timeout: 5000 });

        // Verify mock model badge
        await expect(page.getByText(/Model: mock-gemini-model/i)).toBeVisible();
    });
});
