/* ============================================================
   TABLA DE POSICIONES — tabla.html
   Carga el ranking desde Supabase y permite a un administrador
   (contraseña local) editar o eliminar jugadores.
   ============================================================ */

const usuarioActivo = localStorage.getItem('fw_usuario_activo');
if (!usuarioActivo) window.location.href = 'index.html';

const ADMIN_PASSWORD = 'slpt2020#';
let modoAdmin = false;
let tablaActual = [];

// Cargar al inicio y refrescar cada 10 segundos
cargarTabla();
setInterval(cargarTabla, 10000);

async function cargarTabla() {
    try {
        const { data, error } = await db
            .from('tabla')
            .select('usuario, puntos')
            .order('puntos', { ascending: false });

        if (error) throw error;

        tablaActual = data || [];
        renderTabla(tablaActual);

        // Indicador verde = conectado
        const sync = document.getElementById('sync-status');
        sync.classList.remove('sync-indicator--offline');
        sync.innerHTML = '<span class="sync-dot"></span> En vivo';

    } catch (err) {
        console.error('Error cargando tabla:', err);
        const sync = document.getElementById('sync-status');
        sync.classList.add('sync-indicator--offline');
        sync.innerHTML = '<span class="sync-dot sync-dot--offline"></span> Sin conexión';
    }
}

function renderTabla(tabla) {
    tabla = [...tabla].sort((a, b) => b.puntos - a.puntos);
    const tbody = document.getElementById('tabla-body');
    tbody.innerHTML = '';

    document.getElementById('col-acciones').style.display = modoAdmin ? '' : 'none';

    if (tabla.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="table-empty-state">No hay jugadores aún.</td></tr>';
        return;
    }

    tabla.forEach((jugador, index) => {
        const esActivo = jugador.usuario === usuarioActivo;
        const tr = document.createElement('tr');
        tr.className = esActivo ? 'row--active' : '';

        let accionesHTML = '';
        if (modoAdmin) {
            accionesHTML = `<td>
                <button class="btn-edit" onclick="editarPuntos('${jugador.usuario}')">✏ Editar</button>
                <button class="btn-delete" onclick="eliminarJugador('${jugador.usuario}')">🗑 Eliminar</button>
            </td>`;
        }

        tr.innerHTML = `
            <td><span class="rank">#${index + 1}</span></td>
            <td class="${esActivo ? 'player-name--active' : ''}">
                ${jugador.usuario}${esActivo ? ' <span class="player-name-tag">(tú)</span>' : ''}
            </td>
            <td><span class="points">${jugador.puntos}</span> pts</td>
            ${accionesHTML}
        `;
        tbody.appendChild(tr);
    });
}

// Editar puntos → guarda en Supabase → recarga tabla
async function editarPuntos(usuario) {
    const jugador = tablaActual.find(u => u.usuario === usuario);
    if (!jugador) return;

    const nuevoPts = prompt(`Nuevos puntos para "${usuario}":`, jugador.puntos);
    if (nuevoPts === null) return;
    const num = parseInt(nuevoPts);
    if (isNaN(num)) { alert('Ingresa un número válido.'); return; }

    try {
        const { error } = await db
            .from('tabla')
            .update({ puntos: num })
            .eq('usuario', usuario);

        if (error) throw error;
        cargarTabla();
    } catch (err) {
        alert('Error al guardar. Verifica tu conexión.');
        console.error(err);
    }
}

// Eliminar jugador → borra de Supabase → recarga tabla
async function eliminarJugador(usuario) {
    if (!confirm(`¿Seguro que quieres eliminar a "${usuario}" de la tabla?`)) return;
    try {
        const { error } = await db
            .from('tabla')
            .delete()
            .eq('usuario', usuario);

        if (error) throw error;
        cargarTabla();
    } catch (err) {
        alert('Error al eliminar.');
        console.error(err);
    }
}

function pedirAdmin() {
    document.getElementById('admin-pass').value = '';
    document.getElementById('admin-error').classList.remove('show');
    document.getElementById('admin-modal').classList.add('show');
    setTimeout(() => document.getElementById('admin-pass').focus(), 100);
}

function cerrarModal() {
    document.getElementById('admin-modal').classList.remove('show');
}

function verificarAdmin() {
    const pass = document.getElementById('admin-pass').value;
    if (pass === ADMIN_PASSWORD) {
        modoAdmin = true;
        cerrarModal();
        document.getElementById('admin-bar').classList.add('show');
        document.getElementById('admin-btn').style.display = 'none';
        renderTabla(tablaActual);
    } else {
        document.getElementById('admin-error').classList.add('show');
    }
}

function bloquearAdmin() {
    modoAdmin = false;
    document.getElementById('admin-bar').classList.remove('show');
    document.getElementById('admin-btn').style.display = '';
    renderTabla(tablaActual);
}

function cerrarSesion() {
    localStorage.removeItem('fw_usuario_activo');
    window.location.href = 'index.html';
}
