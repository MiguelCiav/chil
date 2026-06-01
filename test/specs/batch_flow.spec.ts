describe('Módulo de Nuevo Lote - Wizard Flow', () => {
    it('should complete the entire batch creation and verification flow successfully', async () => {
        // 1. Load the main batches list page
        await browser.url('http://localhost:5173/lotes');
        
        // Wait for connection banner to show it is loaded
        const dbBanner = await $('div*=Conectado a la Base de Datos');
        await expect(dbBanner).toExist();

        // 2. Navigate to Wizard
        const newBatchBtn = await $('button=Nuevo Lote');
        await newBatchBtn.click();
        
        // Wait for Wizard Step 1 to load
        const step1Header = await $('div*=Configuración del Lote');
        await expect(step1Header).toExist();

        // 3. Fill Step 1 Form
        const nameInput = await $('input[placeholder="Ej. Lote Aniversario Mayo 2026"]');
        await nameInput.setValue('Lote Prueba E2E 2026');

        const regionSelect = await $('#region-select');
        await regionSelect.selectByAttribute('value', '1'); // Región Capital

        // Cascading delay simulation - district gets enabled
        const districtSelect = await $('#district-select');
        await districtSelect.waitForEnabled({ timeout: 3000 });
        await districtSelect.selectByAttribute('value', '10'); // Distrito Sucre

        // Cascading delay simulation - group gets enabled
        const groupSelect = await $('#group-select');
        await groupSelect.waitForEnabled({ timeout: 3000 });
        await groupSelect.selectByAttribute('value', '100'); // Grupo Scout San Luis

        const recognitionSelect = await $('#recognition-select');
        await recognitionSelect.selectByAttribute('value', 'sct-wood-badge'); // Insignia de Madera

        // Submit Step 1
        const nextStepBtn = await $('button=Siguiente paso');
        await expect(nextStepBtn).toBeEnabled();
        await nextStepBtn.click();

        // 4. Wizard Step 2 (Verify and Load Cédulas)
        const step2Header = await $('div*=Verificación de Cédulas');
        await expect(step2Header).toExist();

        // Enter young and adult member cédulas
        const youngsTextarea = await $('textarea[placeholder*="29111222"]');
        await youngsTextarea.setValue('30123456\n30789012');

        const adultsTextarea = await $('textarea[placeholder*="12333444"]');
        await adultsTextarea.setValue('15123456');

        // Click Verify
        const verifyBtn = await $('button=Iniciar Verificación');
        await verifyBtn.click();

        // Wait for async scraper verification to complete and Table results to show
        const validBadge = await $('span*=Registro válido');
        await validBadge.waitForExist({ timeout: 8000 });

        // Continue to Step 3
        const step2ContinueBtn = await $('button=Validar y Continuar');
        await step2ContinueBtn.click();

        // 5. Wizard Step 3 (Review Final Batch)
        const step3Header = await $('div*=Revisión Final del Lote');
        await expect(step3Header).toExist();

        // Verify summary totals
        const totalBadge = await $('div*=Total:');
        await expect(totalBadge).toExist();

        // Finalize Batch
        const finalizeBtn = await $('button*=Generar Lote');
        await finalizeBtn.click();

        // 6. Success Screen
        const successHeader = await $('h1=¡Lote Generado Exitosamente!');
        await expect(successHeader).toExist();

        // Verify statistical cards
        const membersCard = await $('div*=Miembros Totales');
        await expect(membersCard).toExist();
    });
});
