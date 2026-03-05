import { generateChunks } from '../src/lib/chunking';
import { cosineSimilarity } from '../src/lib/math';
import { PDFDocument } from 'pdf-lib';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Mock data for testing
const MOCK_TEXT = `This is a sample text for testing the RAG pipeline. 
It contains multiple sentences to verify chunking logic. 
The goal is to ensure that text is split correctly into overlapping segments.`;

const MOCK_VECTOR_A = [0.1, 0.2, 0.3, 0.4, 0.5];
const MOCK_VECTOR_B = [0.1, 0.2, 0.3, 0.4, 0.5]; // Identical
const MOCK_VECTOR_C = [0.5, 0.4, 0.3, 0.2, 0.1]; // Orthogonal-ish

async function runBackendTests() {
    console.log('🧪 Starting Backend Logic Tests...\n');
    let passed = 0;
    let failed = 0;

    // Test 1: Chunking Logic
    try {
        console.log('1️⃣  Testing Chunking Logic...');
        const chunks = generateChunks(MOCK_TEXT, 50, 10);

        if (chunks.length > 0 && chunks[0].text.length <= 50) {
            console.log('✅ Chunking passed');
            passed++;
        } else {
            console.error('❌ Chunking failed: Invalid chunk size or count');
            failed++;
        }
    } catch (e) {
        console.error('❌ Chunking crashed', e);
        failed++;
    }

    // Test 2: Math Logic (Cosine Similarity)
    try {
        console.log('\n2️⃣  Testing Cosine Similarity...');
        const simIdentical = cosineSimilarity(MOCK_VECTOR_A, MOCK_VECTOR_B);
        const simDifferent = cosineSimilarity(MOCK_VECTOR_A, MOCK_VECTOR_C);

        if (Math.abs(simIdentical - 1.0) < 0.0001 && simDifferent < 1.0) {
            console.log(`✅ Math passed (Identical: ${simIdentical.toFixed(4)}, Diff: ${simDifferent.toFixed(4)})`);
            passed++;
        } else {
            console.error(`❌ Math failed: Identical=${simIdentical}, Diff=${simDifferent}`);
            failed++;
        }
    } catch (e) {
        console.error('❌ Math crashed', e);
        failed++;
    }

    // Test 3: PDF Parsing (Integration)
    try {
        console.log('\n3️⃣  Testing PDF Parsing (Integration)...');

        // Create a PDF
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        page.drawText('Hello Ragie-Lite! This is a test PDF.');
        const pdfBytes = await pdfDoc.save();

        // v2 API usage: const { PDFParse } = require('pdf-parse');
        const pdfModule = require('pdf-parse');
        const PDFParse = pdfModule.PDFParse || pdfModule.default?.PDFParse;

        if (!PDFParse) {
            throw new Error('Could not find PDFParse class in export');
        }

        const buffer = Buffer.from(pdfBytes);
        const parser = new PDFParse({ data: buffer });
        const data = await parser.getText();
        await parser.destroy(); // Important cleanup

        const extractedText = data.text.trim();

        if (extractedText.includes('Hello Ragie-Lite!')) {
            console.log(`✅ PDF Parsing passed (Extracted: "${extractedText.substring(0, 30)}...")`);
            passed++;
        } else {
            console.log(`❌ PDF Parsing failed. Content: "${extractedText}"`);
            failed++;
        }

    } catch (e) {
        console.error('❌ PDF Parsing crashed', e);
        failed++;
    }

    console.log(`\n🎉 Tests Completed: ${passed} Passed, ${failed} Failed`);
}

runBackendTests();
