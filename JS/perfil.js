/* ============================================================
   PERFIL — perfil.html
   Muestra los datos del usuario activo y su posición actual
   en la tabla de puntos, refrescando cada 15 segundos.
   ============================================================ */

const usuarioActivo = localStorage.getItem('fw_usuario_activo');
if (!usuarioActivo) window.location.href = 'index.html';

document.getElementById('nombre-perfil').textContent = usuarioActivo;
document.getElementById('usuario-display').textContent = usuarioActivo;

async function cargarPerfil() {
    try {
        const { data, error } = await db
            .from('tabla')
            .select('usuario, puntos')
            .order('puntos', { ascending: false });

        if (error) throw error;

        const tabla = data || [];
        const miData = tabla.find(u => u.usuario === usuarioActivo);
        const miPosicion = tabla.findIndex(u => u.usuario === usuarioActivo) + 1;

        document.getElementById('puntos-display').textContent =
            miData ? miData.puntos + ' pts' : '0 pts';
        document.getElementById('posicion-display').textContent =
            miPosicion > 0 ? '#' + miPosicion : '—';

    } catch (err) {
        console.error('Error cargando perfil:', err);
        document.getElementById('puntos-display').textContent = 'Error';
        document.getElementById('posicion-display').textContent = 'Error';
    }
}

cargarPerfil();
setInterval(cargarPerfil, 15000);

function cerrarSesion() {
    localStorage.removeItem('fw_usuario_activo');
    window.location.href = 'index.html';
}
