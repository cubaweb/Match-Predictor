/* ============================================================
   LOGIN — index.html
   Valida contra la lista de usuarios autorizados y registra
   al usuario en Supabase la primera vez que entra.
   ============================================================ */

// Lista de usuarios autorizados
const USUARIOS = [
    { usuario: 'rayc', password: 'match17' },
    { usuario: 'David Soria', password: 'david05' },
    { usuario: 'Maikel', password: 'maikelrv2026' },
    { usuario: 'Victi', password: 'victi00' },
    { usuario: 'Pikuli', password: 'pikuli01' },
    { usuario: 'Eduardo', password: 'mateo24' },
    { usuario: 'Laidel', password: 'dani25' },
    { usuario: 'Yamil', password: 'maikol03' },
    { usuario: 'Gustavo', password: 'helen07' },
    { usuario: 'Denzel', password: 'amador20' },
    { usuario: 'Harold', password: 'brasil05' },
];

window.iniciarSesion = async function () {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value;
    const errorMsg = document.getElementById('error-msg');
    const btn = document.getElementById('btn-login');

    errorMsg.classList.remove('show');

    const encontrado = USUARIOS.find(u => u.usuario === user && u.password === pass);
    if (!encontrado) {
        errorMsg.textContent = 'Usuario o contraseña incorrectos.';
        errorMsg.classList.add('show');
        return;
    }

    btn.textContent = 'Entrando...';
    btn.disabled = true;

    try {
        // Registrar en Supabase si es la primera vez (ignora si ya existe)
        const { error } = await db
            .from('tabla')
            .upsert({ usuario: user, puntos: 0 }, { onConflict: 'usuario', ignoreDuplicates: true });

        if (error) throw error;

        localStorage.setItem('fw_usuario_activo', user);
        window.location.href = 'partidos.html';

    } catch (err) {
        console.error(err);
        errorMsg.textContent = 'Error de conexión. Revisa la conexion.';
        errorMsg.classList.add('show');
        btn.textContent = 'Iniciar Sesión';
        btn.disabled = false;
    }
};

document.addEventListener('keydown', e => {
    if (e.key === 'Enter') window.iniciarSesion();
});
