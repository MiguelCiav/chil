describe('My Tauri Application', () => {
    it('should load the page', async () => {
        const div = await $('div');
        await expect(div).toExist();
    });
});
