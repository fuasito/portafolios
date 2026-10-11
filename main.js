// Año actual en el pie de página
document.getElementById('anio').textContent = new Date().getFullYear();

// Botón "Copiar email"
const boton = document.getElementById('copiar');
const email = document.getElementById('email').textContent.trim();

boton.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(email);
        boton.textContent = 'Email copiado';
    } catch (error) {
        boton.textContent = 'No se pudo copiar';
    }
    setTimeout(() => { boton.textContent = 'Copiar email'; }, 2000);
});