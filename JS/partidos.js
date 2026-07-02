/* ============================================================
   PARTIDOS — partidos.html
   ------------------------------------------------------------
   Índice de este archivo:
     1. Datos de los partidos y renderizado de las tarjetas
     2. Configuración EmailJS
     3. Estado de sesión y caché local de predicciones
     4. Predicciones del usuario (modal, guardado, botones)
     5. Estado de partidos (bloqueo / resultado) desde Supabase
     6. Modo admin (bloquear partidos, cargar resultados)
     7. Cálculo de puntos al confirmar un resultado
   ============================================================ */

/* ------------------------------------------------------------
   1. DATOS DE LOS PARTIDOS
   Agregar un partido nuevo es tan simple como sumar un objeto
   a este arreglo: el resto de la página se genera solo.
   ------------------------------------------------------------ */
const MATCHES_INICIALES = [
    { id: 'card-26', local: 'Brasil',      localLogo: 'Imagenes/images 1.jpg',  visitante: 'Japon',      visitanteLogo: 'Imagenes/images 7.jpg',  hora: 'Lun, 1:00 p.m.' },
    { id: 'card-27', local: 'Alemania',    localLogo: 'Imagenes/images 2.jpg',  visitante: 'Paraguay',   visitanteLogo: 'Imagenes/images 20.jpg', hora: 'Lun, 4:00 p.m.' },
    { id: 'card-28', local: 'Holanda',     localLogo: 'Imagenes/images 17.jpg', visitante: 'Marruecos',  visitanteLogo: 'Imagenes/images 6.jpg',  hora: 'Lun, 4:30 p.m.' },
    { id: 'card-29', local: 'Francia',     localLogo: 'Imagenes/images 16.jpg', visitante: 'Suecia',     visitanteLogo: 'Imagenes/images 8.jpg',  hora: 'Mar, 5:00 p.m.' },
    { id: 'card-30', local: 'Inglaterra',  localLogo: 'Imagenes/images 5.jpg',  visitante: 'Congo',      visitanteLogo: 'Imagenes/images 11.jpg', hora: 'Mier, 12:00 p.m.' },
    { id: 'card-31', local: 'Belgica',     localLogo: 'Imagenes/images 15.jpg', visitante: 'Senegal',    visitanteLogo: 'Imagenes/images 9.jpg',  hora: 'Mier, 4:00 p.m.' },
    { id: 'card-32', local: 'España',      localLogo: 'Imagenes/images 19.jpg', visitante: 'Austria',    visitanteLogo: 'Imagenes/images 10.jpg', hora: 'Jue, 3:00 p.m.' },
    { id: 'card-33', local: 'Portugal',    localLogo: 'Imagenes/images 4.jpg',  visitante: 'Croacia',    visitanteLogo: 'Imagenes/images 13.jpg', hora: 'Jue, 7:00 p.m.' },
    { id: 'card-34', local: 'Argentina',   localLogo: 'Imagenes/images 3.jpg',  visitante: 'Cabo Verde', visitanteLogo: 'Imagenes/images 18.jpg', hora: 'Vie, 6:00 p.m.' },
    { id: 'card-35', local: 'Colombia',    localLogo: 'Imagenes/images 12.jpg', visitante: 'Ghana',      visitanteLogo: 'Imagenes/images 14.jpg', hora: 'Vie, 9:30 p.m.' },
];

function renderPartidos() {
    const grid = document.getElementById('matches-grid');
    grid.innerHTML = MATCHES_INICIALES.map(m => `
        <div class="match-card" id="${m.id}">
            <div class="team">
                <div class="team-logo" style="background-image:url('${m.localLogo}');"></div>
                <span>${m.local}</span>
            </div>
            <div class="match-info">
                <div class="vs">VS</div>
                <div class="match-time">${m.hora}</div>
                <button class="predict-btn" id="btn-${m.id}" onclick="abrirModal('${m.local}', '${m.visitante}', '${m.id}')">Predecir</button>
            </div>
            <div class="team">
                <div class="team-logo" style="background-image:url('${m.visitanteLogo}');"></div>
                <span>${m.visitante}</span>
            </div>
        </div>
    `).join('');
}

/* ------------------------------------------------------------
   2. CONFIGURACIÓN EMAILJS
   Reemplaza estos 3 valores con los tuyos de emailjs.com
   ------------------------------------------------------------ */
const EMAILJS_PUBLIC_KEY = 'Zy0vbACtGpt2ogDGl';
const EMAILJS_SERVICE_ID = 'service_ocgqkub';
const EMAILJS_TEMPLATE_ID = 'template_azifs4l';

emailjs.init(EMAILJS_PUBLIC_KEY);

const ADMIN_PASSWORD_PARTIDOS = 'slpt2020#';
let modoAdminPartidos = false;
let estadoPartidos = {}; // card_id -> { bloqueado, resuelto, resultado_local, resultado_visitante }

/* ------------------------------------------------------------
   3. ESTADO DE SESIÓN Y CACHÉ LOCAL DE PREDICCIONES
   ------------------------------------------------------------ */
const usuarioActivo = localStorage.getItem('fw_usuario_activo');
if (!usuarioActivo) window.location.href = 'index.html';

const STORAGE_KEY = 'fw_predicciones_' + usuarioActivo;
let prediccionesGuardadas = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

let cardActual = null;
let localActual = '';
let visitanteActual = '';
let esCambio = false;

// Restaurar estado visual de botones al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    renderPartidos();

    // Primero pintamos con lo que haya en caché local (funciona sin conexión)
    Object.keys(prediccionesGuardadas).forEach(cardId => {
        const pred = prediccionesGuardadas[cardId];
        marcarPrediccionEnBoton(cardId, pred.marcador);
    });
    cargarEstadoPartidos();
    cargarMisResultados();
    cargarMisPredicciones();
});

/* ------------------------------------------------------------
   4. PREDICCIONES DEL USUARIO
   ------------------------------------------------------------ */

// Última predicción del usuario por partido (desde Supabase)
async function cargarMisPredicciones() {
    try {
        const { data, error } = await db
            .from('predicciones')
            .select('card_id, local, visitante, marcador, gl, gv')
            .eq('usuario', usuarioActivo);
        if (error) throw error;

        (data || []).forEach(row => {
            const marcador = row.marcador || (row.gl + ' - ' + row.gv);
            prediccionesGuardadas[row.card_id] = {
                marcador: marcador,
                local: row.local,
                visitante: row.visitante
            };
        });

        // Sincronizar caché local para que funcione offline la próxima vez
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prediccionesGuardadas));

        Object.keys(prediccionesGuardadas).forEach(cardId => {
            marcarPrediccionEnBoton(cardId, prediccionesGuardadas[cardId].marcador);
        });
    } catch (err) {
        console.error('Error cargando mis predicciones:', err);
    }
}

function abrirModal(local, visitante, cardId) {
    if (estadoPartidos[cardId]?.bloqueado) {
        mostrarToast('Las predicciones para este partido están cerradas.', true);
        return;
    }
    cardActual = cardId;
    localActual = local;
    visitanteActual = visitante;

    document.getElementById('modal-titulo').textContent = local + ' vs ' + visitante;
    document.getElementById('nombre-local').textContent = local;
    document.getElementById('nombre-visitante').textContent = visitante;

    // Verificar si ya hay predicción previa
    const predAnterior = prediccionesGuardadas[cardId];
    const divAnterior = document.getElementById('prediccion-anterior');
    const btnConfirmar = document.getElementById('btn-confirmar');

    if (predAnterior) {
        esCambio = true;
        divAnterior.classList.add('show');
        document.getElementById('texto-anterior').textContent = predAnterior.marcador;
        btnConfirmar.textContent = 'Actualizar';
        // Pre-llenar con valores anteriores
        const partes = predAnterior.marcador.split('-');
        document.getElementById('goles-local').value = partes[0]?.trim() || 0;
        document.getElementById('goles-visitante').value = partes[1]?.trim() || 0;
    } else {
        esCambio = false;
        divAnterior.classList.remove('show');
        btnConfirmar.textContent = 'Confirmar';
        document.getElementById('goles-local').value = 0;
        document.getElementById('goles-visitante').value = 0;
    }

    document.getElementById('modal').classList.add('show');
}

function cerrarModal() {
    document.getElementById('modal').classList.remove('show');
}

async function confirmarPrediccion() {
    const golesLocal = document.getElementById('goles-local').value;
    const golesVisitante = document.getElementById('goles-visitante').value;
    const marcador = golesLocal + ' - ' + golesVisitante;
    const ahora = new Date().toLocaleString('es-MX');

    cerrarModal();
    document.getElementById('sending-overlay').classList.add('show');

    try {
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            nombre_usuario: usuarioActivo,
            partido: localActual + ' vs ' + visitanteActual,
            prediccion: localActual + ' ' + marcador + ' ' + visitanteActual,
            marcador: marcador,
            tipo: esCambio ? 'CAMBIO DE PREDICCIÓN' : 'NUEVA PREDICCIÓN',
            fecha: ahora
        });

        // Guardar predicción localmente
        prediccionesGuardadas[cardActual] = {
            marcador: marcador,
            local: localActual,
            visitante: visitanteActual
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prediccionesGuardadas));

        // Guardar/actualizar predicción en Supabase (para que el admin pueda calificarla)
        try {
            await db.from('predicciones').upsert({
                usuario: usuarioActivo,
                card_id: cardActual,
                local: localActual,
                visitante: visitanteActual,
                gl: parseInt(golesLocal),
                gv: parseInt(golesVisitante),
                marcador: marcador,
                puntos: null
            }, { onConflict: 'usuario,card_id' });
        } catch (e) {
            console.error('Error guardando predicción en Supabase:', e);
        }

        // Actualizar botón visualmente
        marcarPrediccionEnBoton(cardActual, marcador);

        document.getElementById('sending-overlay').classList.remove('show');
        mostrarToast(esCambio ? 'Predicción actualizada' : '✔ Predicción enviada');

    } catch (error) {
        console.error('Error EmailJS:', error);
        document.getElementById('sending-overlay').classList.remove('show');
        mostrarToast('❌ Error al enviar.', true);
    }
}

function marcarPrediccionEnBoton(cardId, marcador) {
    const card = document.getElementById(cardId);
    if (!card) return;

    const pred = prediccionesGuardadas[cardId];
    const textoPredicho = pred ? pred.local + ' ' + marcador + ' ' + pred.visitante : marcador;
    const bloqueado = !!estadoPartidos[cardId]?.bloqueado;

    const contenido = `
        <span class="btn-predicho" title="${textoPredicho}">${marcador}</span>
        <button class="btn-cambiar" ${bloqueado ? 'disabled' : ''} onclick="abrirModal('${pred?.local || localActual}', '${pred?.visitante || visitanteActual}', '${cardId}')">${bloqueado ? ' Cerrado' : 'Cambiar'}</button>
    `;

    // Si ya existe el área de predicción (de una carga anterior), solo actualizamos su contenido
    let area = document.getElementById('btn-area-' + cardId);
    if (area) {
        area.innerHTML = contenido;
        return;
    }

    // Si no existe todavía, reemplazamos el botón original "Predecir"
    const btnOriginal = document.getElementById('btn-' + cardId);
    if (!btnOriginal) return;
    btnOriginal.outerHTML = `<div class="btns-prediccion" id="btn-area-${cardId}">${contenido}</div>`;
}

function mostrarToast(mensaje = ' Predicción enviada', esError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = mensaje;
    toast.style.background = esError ? 'var(--danger)' : 'var(--success)';
    toast.style.color = esError ? '#fff' : 'var(--primary-bg)';
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3500);
}

function cerrarSesion() {
    localStorage.removeItem('fw_usuario_activo');
    window.location.href = 'index.html';
}

/* ------------------------------------------------------------
   5. ESTADO DE PARTIDOS (bloqueo / resultado) — Supabase
   ------------------------------------------------------------ */
async function cargarEstadoPartidos() {
    try {
        const { data, error } = await db.from('partidos_estado').select('*');
        if (error) throw error;
        estadoPartidos = {};
        (data || []).forEach(row => { estadoPartidos[row.card_id] = row; });
        document.querySelectorAll('.match-card').forEach(card => aplicarBloqueoCard(card.id));
    } catch (err) {
        console.error('Error cargando estado de partidos:', err);
    }
}

function aplicarBloqueoCard(cardId) {
    const estado = estadoPartidos[cardId];
    const bloqueado = !!estado?.bloqueado;

    const btnPredecir = document.getElementById('btn-' + cardId);
    if (btnPredecir) {
        btnPredecir.disabled = bloqueado;
        btnPredecir.textContent = bloqueado ? 'Cerrado' : 'Predecir';
    }
    const areaPred = document.getElementById('btn-area-' + cardId);
    if (areaPred) {
        const btnCambiar = areaPred.querySelector('.btn-cambiar');
        if (btnCambiar) {
            btnCambiar.disabled = bloqueado;
            btnCambiar.textContent = bloqueado ? 'Cerrado' : 'Cambiar';
        }
    }

    // Resultado final, justo debajo de "Cerrado"
    const card = document.getElementById(cardId);
    const matchInfo = card ? card.querySelector('.match-info') : null;
    if (matchInfo) {
        let resultadoEl = document.getElementById('resultado-final-' + cardId);
        const tieneResultado = bloqueado && estado?.resuelto &&
            estado?.resultado_local != null && estado?.resultado_visitante != null;

        if (tieneResultado) {
            if (!resultadoEl) {
                resultadoEl = document.createElement('div');
                resultadoEl.id = 'resultado-final-' + cardId;
                resultadoEl.className = 'resultado-final';
                matchInfo.appendChild(resultadoEl);
            }
            resultadoEl.textContent = estado.resultado_local + ' - ' + estado.resultado_visitante;
        } else if (resultadoEl) {
            resultadoEl.remove();
        }
    }

    // Refrescar controles de admin si están visibles
    const btnLock = document.getElementById('lock-card-' + cardId);
    if (btnLock) {
        btnLock.textContent = bloqueado ? '🔓 Desbloquear' : '🔒 Bloquear';
        btnLock.classList.toggle('locked', bloqueado);
    }
}

async function cargarMisResultados() {
    try {
        const { data, error } = await db
            .from('predicciones')
            .select('card_id, puntos')
            .eq('usuario', usuarioActivo)
            .not('puntos', 'is', null);
        if (error) throw error;
        (data || []).forEach(row => renderBadge(row.card_id, row.puntos));
    } catch (err) {
        console.error('Error cargando resultados del usuario:', err);
    }
}

function renderBadge(cardId, puntos) {
    const card = document.getElementById(cardId);
    if (!card) return;
    const matchInfo = card.querySelector('.match-info');
    if (!matchInfo) return;

    let clase = 'badge-menos1', texto = '−1';
    if (puntos === 3) { clase = 'badge-mas3'; texto = '+3'; }
    else if (puntos === 1) { clase = 'badge-mas1'; texto = '+1'; }

    let badge = document.getElementById('badge-' + cardId);
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'badge-' + cardId;
        matchInfo.appendChild(badge);
    }
    badge.className = 'badge-puntos ' + clase;
    badge.textContent = texto;
}

/* ------------------------------------------------------------
   6. MODO ADMIN (partidos.html)
   ------------------------------------------------------------ */
function pedirAdminPartidos() {
    document.getElementById('admin-pass-partidos').value = '';
    document.getElementById('admin-error-partidos').classList.remove('show');
    document.getElementById('admin-modal-partidos').classList.add('show');
    setTimeout(() => document.getElementById('admin-pass-partidos').focus(), 100);
}

function cerrarModalAdminPartidos() {
    document.getElementById('admin-modal-partidos').classList.remove('show');
}

function verificarAdminPartidos() {
    const pass = document.getElementById('admin-pass-partidos').value;
    if (pass === ADMIN_PASSWORD_PARTIDOS) {
        modoAdminPartidos = true;
        cerrarModalAdminPartidos();
        document.getElementById('admin-bar-partidos').classList.add('show');
        document.getElementById('admin-btn-partidos').style.display = 'none';
        renderControlesAdminTodasLasCards();
    } else {
        document.getElementById('admin-error-partidos').classList.add('show');
    }
}

function salirAdminPartidos() {
    modoAdminPartidos = false;
    document.getElementById('admin-bar-partidos').classList.remove('show');
    document.getElementById('admin-btn-partidos').style.display = '';
    document.querySelectorAll('.admin-card-controls').forEach(el => el.classList.remove('show'));
}

function obtenerEquiposDeCard(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return { local: '', visitante: '' };
    const nombres = card.querySelectorAll('.team span');
    return { local: nombres[0]?.textContent || '', visitante: nombres[1]?.textContent || '' };
}

function renderControlesAdminTodasLasCards() {
    document.querySelectorAll('.match-card').forEach(card => {
        const cardId = card.id;
        const matchInfo = card.querySelector('.match-info');
        if (!matchInfo) return;
        let controles = document.getElementById('admin-controls-' + cardId);
        if (!controles) {
            const { local, visitante } = obtenerEquiposDeCard(cardId);
            controles = document.createElement('div');
            controles.id = 'admin-controls-' + cardId;
            controles.className = 'admin-card-controls';
            controles.innerHTML = `
                <button id="lock-card-${cardId}" class="btn-admin-mini btn-lock" onclick="toggleBloqueoCard('${cardId}')">🔒 Bloquear</button>
                <button class="btn-admin-mini btn-resultado" onclick="abrirModalResultado('${cardId}', '${local}', '${visitante}')">📝 Resultado</button>
            `;
            matchInfo.appendChild(controles);
        }
        controles.classList.add('show');
        aplicarBloqueoCard(cardId);
    });
}

async function toggleBloqueoCard(cardId) {
    const actual = !!estadoPartidos[cardId]?.bloqueado;
    try {
        const { error } = await db.from('partidos_estado').upsert({
            card_id: cardId,
            bloqueado: !actual
        }, { onConflict: 'card_id' });
        if (error) throw error;
        estadoPartidos[cardId] = { ...(estadoPartidos[cardId] || {}), card_id: cardId, bloqueado: !actual };
        aplicarBloqueoCard(cardId);
    } catch (err) {
        console.error('Error actualizando bloqueo:', err);
        mostrarToast('❌ Error al actualizar el bloqueo.', true);
    }
}

/* ------------------------------------------------------------
   7. RESULTADO Y CÁLCULO DE PUNTOS
   ------------------------------------------------------------ */
let cardResultadoActual = null;

function abrirModalResultado(cardId, local, visitante) {
    cardResultadoActual = cardId;
    document.getElementById('resultado-titulo').textContent = local + ' vs ' + visitante;
    document.getElementById('resultado-nombre-local').textContent = local;
    document.getElementById('resultado-nombre-visitante').textContent = visitante;
    const estado = estadoPartidos[cardId];
    document.getElementById('resultado-goles-local').value = estado?.resultado_local ?? 0;
    document.getElementById('resultado-goles-visitante').value = estado?.resultado_visitante ?? 0;
    document.getElementById('modal-resultado').classList.add('show');
}

function cerrarModalResultado() {
    document.getElementById('modal-resultado').classList.remove('show');
}

async function confirmarResultado() {
    const cardId = cardResultadoActual;
    const gl = parseInt(document.getElementById('resultado-goles-local').value);
    const gv = parseInt(document.getElementById('resultado-goles-visitante').value);
    if (isNaN(gl) || isNaN(gv)) { mostrarToast('❌ Ingresa un resultado válido.', true); return; }

    const btn = document.getElementById('btn-confirmar-resultado');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
        // 1. Traer todas las predicciones de este partido
        const { data: predicciones, error: errPred } = await db
            .from('predicciones')
            .select('*')
            .eq('card_id', cardId);
        if (errPred) throw errPred;

        const realDir = gl > gv ? 1 : (gl < gv ? -1 : 0);

        // 2. Calcular puntos por usuario y actualizar cada predicción
        for (const pred of (predicciones || [])) {
            const predDir = pred.gl > pred.gv ? 1 : (pred.gl < pred.gv ? -1 : 0);
            let pts;
            if (pred.gl === gl && pred.gv === gv) pts = 3;
            else if (predDir === realDir) pts = 1;
            else pts = -1;

            const { error: errUpd } = await db
                .from('predicciones')
                .update({ puntos: pts })
                .eq('id', pred.id);
            if (errUpd) throw errUpd;

            // 3. Sumar puntos a la tabla de posiciones
            const { data: jugador, error: errSel } = await db
                .from('tabla')
                .select('puntos')
                .eq('usuario', pred.usuario)
                .maybeSingle();
            if (errSel) throw errSel;

            const puntosActuales = jugador?.puntos || 0;
            const { error: errTabla } = await db
                .from('tabla')
                .upsert({ usuario: pred.usuario, puntos: puntosActuales + pts }, { onConflict: 'usuario' });
            if (errTabla) throw errTabla;
        }

        // 4. Guardar resultado y bloquear el partido
        const { error: errEstado } = await db.from('partidos_estado').upsert({
            card_id: cardId,
            bloqueado: true,
            resuelto: true,
            resultado_local: gl,
            resultado_visitante: gv
        }, { onConflict: 'card_id' });
        if (errEstado) throw errEstado;

        estadoPartidos[cardId] = { card_id: cardId, bloqueado: true, resuelto: true, resultado_local: gl, resultado_visitante: gv };
        aplicarBloqueoCard(cardId);
        cerrarModalResultado();
        mostrarToast('✔ Resultado guardado y puntos actualizados');
        cargarMisResultados();

    } catch (err) {
        console.error('Error guardando resultado:', err);
        mostrarToast('❌ Error al guardar el resultado.', true);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar resultado';
    }
}
