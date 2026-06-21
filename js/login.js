// ==========================================
// 1. LÓGICA DE INICIO DE SESIÓN
// ==========================================
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault(); // Evita que la página se recargue

    const usernameInput = document.getElementById('username').value;
    const passwordInput = document.getElementById('password').value;
    const alertBox = document.getElementById('alertMessage');
    const btnSubmit = document.getElementById('btnSubmit');

    // Estado de carga en el botón
    btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Validando...';
    btnSubmit.disabled = true;

    try {
        // Petición POST a tu API de Spring Boot
        const response = await fetch('http://localhost:8080/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: usernameInput,
                password: passwordInput
            })
        });

        if (response.ok) {
            const data = await response.json();
            
            // 1. Extraemos el rol del usuario
            const rolUsuario = data.roles[0]; 
            
            // Mostrar mensaje de éxito
            alertBox.className = 'alert alert-success';
            alertBox.textContent = `¡Bienvenido ${data.username}! Ingresando a tu panel...`;
            alertBox.classList.remove('d-none');

            // 2. Guardamos los datos de sesión en el navegador
            localStorage.setItem('jwtToken', data.token);
            localStorage.setItem('userRoles', JSON.stringify(data.roles));

            // ==========================================
            // 3. ENRUTADOR INTELIGENTE DE ROLES
            // ==========================================
            setTimeout(() => {
                if (rolUsuario === 'ROLE_ADMIN') {
                    window.location.href = 'dashboard-admin.html';
                } 
                else if (rolUsuario === 'ROLE_MEDICO') {
                    window.location.href = 'dashboard-medico.html';
                } 
                else {
                    window.location.href = 'dashboard.html';
                }
            }, 1500);

        } else {
            // Mostrar error de credenciales
            alertBox.className = 'alert alert-danger';
            alertBox.textContent = 'Usuario o contraseña incorrectos.';
            alertBox.classList.remove('d-none');
        }
    } catch (error) {
        // Error de conexión
        alertBox.className = 'alert alert-warning';
        alertBox.textContent = 'Error de conexión con el servidor. ¿Está encendido Spring Boot?';
        alertBox.classList.remove('d-none');
    } finally {
        // Restaurar el botón
        btnSubmit.innerHTML = 'Ingresar <i class="bi bi-box-arrow-in-right"></i>';
        btnSubmit.disabled = false;
    }
}); // <--- AQUÍ ES DONDE DEBE CERRAR EL INICIO DE SESIÓN


// ==========================================
// 2. LÓGICA PARA RESTABLECER CONTRASEÑA
// ==========================================
async function cambiarPassword() {
    const username = document.getElementById('recUsername').value;
    const nuevaPassword = document.getElementById('recNuevaPassword').value;
    const btnRestablecer = document.getElementById('btnRestablecer');

    if (!username || !nuevaPassword) {
        Swal.fire({ icon: 'warning', title: 'Campos vacíos', text: 'Por favor ingresa tu DNI y tu nueva contraseña.' });
        return;
    }

    btnRestablecer.disabled = true;
    btnRestablecer.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Procesando...';

    try {
        const response = await fetch('http://localhost:8080/api/auth/restablecer-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: username, 
                nuevaPassword: nuevaPassword 
            })
        });

        if (response.ok) {
            // Cerramos el modal
            const modalElement = document.getElementById('modalRecuperar');
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            modalInstance.hide();

            // Limpiamos los campos
            document.getElementById('recUsername').value = '';
            document.getElementById('recNuevaPassword').value = '';

            Swal.fire({
                icon: 'success',
                title: '¡Contraseña Actualizada!',
                text: 'Ya puedes iniciar sesión con tu nueva clave.',
                confirmButtonColor: '#198754'
            });
        } else {
            const data = await response.json();
            Swal.fire({ icon: 'error', title: 'Error', text: data.mensaje });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error de conexión', text: 'No se pudo conectar con el servidor.' });
    } finally {
        btnRestablecer.disabled = false;
        btnRestablecer.innerHTML = 'Actualizar Contraseña';
    }
}