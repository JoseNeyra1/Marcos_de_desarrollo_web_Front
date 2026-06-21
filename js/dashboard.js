// ==========================================
// CONFIGURACIÓN INICIAL Y SEGURIDAD
// ==========================================
const token = localStorage.getItem('jwtToken');
if (!token) {
    // Si no hay token, lo devolvemos al login inmediatamente
    window.location.href = 'index.html';
}

// Extraer los datos del token
const payload = JSON.parse(atob(token.split('.')[1]));
document.getElementById('navUsername').textContent = `Hola, ${payload.sub}`;
document.getElementById('perfilDni').textContent = payload.sub;
document.getElementById('perfilNombre').textContent = 'Paciente'; 

// ==========================================
// SECCIÓN 1: CARGAR MIS CITAS AL INICIO
// ==========================================
async function cargarCitas() {
    try {
        const response = await fetch('http://localhost:8080/api/citas/mis-citas', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const citas = await response.json();
            renderizarCitas(citas);
        } else {
            if(response.status === 401 || response.status === 403) {
                Swal.fire({ icon: 'error', title: 'Sesión Expirada', text: 'Por favor, vuelve a iniciar sesión.' });
                setTimeout(cerrarSesion, 2000);
            } else {
                document.getElementById('contenedorCitas').innerHTML = '<p class="text-danger">Error al cargar las citas.</p>';
            }
        }
    } catch (error) {
        document.getElementById('contenedorCitas').innerHTML = '<p class="text-danger">Error de conexión con el servidor.</p>';
    }
}

function renderizarCitas(citas) {
    const contenedor = document.getElementById('contenedorCitas');
    
    if (citas.length === 0) {
        contenedor.innerHTML = '<div class="alert alert-info text-center">No tienes citas médicas pendientes.</div>';
        return;
    }

    let html = '';
    citas.forEach(cita => {
        const fechaObj = new Date(cita.fechaHora);
        const fechaFormat = fechaObj.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
        const horaFormat = fechaObj.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

        // Cambiar el color del estado dependiendo si está Confirmada, Atendida o Cancelada
        let badgeColor = cita.estado === 'Confirmada' ? 'bg-primary' : 
                         cita.estado === 'Atendida' ? 'bg-success' :
                         cita.estado === 'Cancelada' ? 'bg-danger' : 'bg-warning text-dark';

        // Deshabilitar botones si ya está cancelada o atendida
        let botonesHtml = (cita.estado === 'Cancelada' || cita.estado === 'Atendida') ? '' : `
            <hr>
            <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarCita(${cita.id_cita})"><i class="bi bi-trash"></i> Cancelar</button>
            </div>
        `;

        html += `
            <div class="card cita-card p-3 mb-3">
                <div class="d-flex justify-content-between align-items-center">
                    <h5 class="mb-0 fw-bold text-primary">${cita.medico.especialidad.nombreEspecialidad}</h5>
                    <span class="badge ${badgeColor}">${cita.estado}</span>
                </div>
                <p class="mb-1 text-muted">Dr. ${cita.medico.nombres} ${cita.medico.apellidos}</p>
                
                <div class="row mt-3">
                    <div class="col-md-6">
                        <p class="mb-0"><i class="bi bi-calendar3 text-info"></i> ${fechaFormat}</p>
                    </div>
                    <div class="col-md-6">
                        <p class="mb-0"><i class="bi bi-clock text-info"></i> ${horaFormat}</p>
                    </div>
                </div>
                ${botonesHtml}
            </div>
        `;
    });
    contenedor.innerHTML = html;
}

// ==========================================
// SECCIÓN 2: LÓGICA DEL MODAL DE AGENDAR CITA
// ==========================================
document.getElementById('btnAbrirModal').addEventListener('click', () => {
    const modal = new bootstrap.Modal(document.getElementById('modalAgendar'));
    modal.show();
    cargarEspecialidades();
});

async function cargarEspecialidades() {
    try {
        const res = await fetch('http://localhost:8080/api/especialidades', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const especialidades = await res.json();
        
        const select = document.getElementById('selectEspecialidad');
        select.innerHTML = '<option value="">Seleccione una especialidad...</option>';
        
        especialidades.forEach(e => {
            select.innerHTML += `<option value="${e.id_especialidad}">${e.nombreEspecialidad}</option>`;
        });
    } catch (error) {
        console.error("Error cargando especialidades: ", error);
    }
}

document.getElementById('selectEspecialidad').addEventListener('change', async (e) => {
    const idEspecialidad = e.target.value;
    const selectMed = document.getElementById('selectMedico');
    
    if(!idEspecialidad) { 
        selectMed.disabled = true; 
        selectMed.innerHTML = '<option value="">Primero elija una especialidad...</option>';
        return; 
    }
    
    try {
        const res = await fetch(`http://localhost:8080/api/medicos/especialidad/${idEspecialidad}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const medicos = await res.json();
        
        selectMed.disabled = false;
        selectMed.innerHTML = '<option value="">Seleccione un médico...</option>';
        
        medicos.forEach(m => {
            selectMed.innerHTML += `<option value="${m.id_medico}">${m.nombres} ${m.apellidos}</option>`;
        });
    } catch (error) {
        console.error("Error cargando médicos: ", error);
    }
});

// Guardar Cita con SweetAlert2
async function guardarCita() {
    const btnGuardar = document.getElementById('btnGuardarCita');
    const idMedico = document.getElementById('selectMedico').value;
    const fechaHora = document.getElementById('fechaHora').value;
    const motivo = document.getElementById('motivo').value;

    if(!idMedico || !fechaHora || !motivo) {
        Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Por favor, complete todos los campos.' });
        return;
    }

    const datos = {
        idMedico: parseInt(idMedico),
        fechaHora: fechaHora,
        motivoConsulta: motivo
    };

    btnGuardar.disabled = true;
    btnGuardar.innerHTML = "Guardando...";

    try {
        const res = await fetch('http://localhost:8080/api/citas/agendar', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });

        if(res.ok) {
            await Swal.fire({
                icon: 'success',
                title: '¡Cita Agendada!',
                text: 'Tu reserva se guardó con éxito.',
                confirmButtonColor: '#20b2aa'
            });
            window.location.reload(); 
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Ocurrió un problema al agendar la cita. Verifica los datos.' });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error de conexión', text: 'No se pudo conectar con el servidor.' });
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = "Confirmar Cita";
    }
}

// ==========================================
// SECCIÓN 3: CANCELAR CITA
// ==========================================
async function eliminarCita(idCita) {
    const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: "Esta acción cancelará tu cita médica y no se puede deshacer.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, cancelar cita',
        cancelButtonText: 'Volver'
    });

    if (!result.isConfirmed) return; 

    try {
        const res = await fetch(`http://localhost:8080/api/citas/${idCita}/cancelar`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if(res.ok) {
            await Swal.fire({ icon: 'success', title: 'Cancelada', text: 'La cita ha sido cancelada exitosamente.', confirmButtonColor: '#20b2aa' });
            window.location.reload();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cancelar la cita.' });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error de conexión', text: 'Fallo al conectar con el servidor.' });
    }
}

// ==========================================
// SECCIÓN 4: CERRAR SESIÓN
// ==========================================
function cerrarSesion() {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userRoles');
    window.location.href = 'index.html';
}

// Iniciar la carga al abrir la página
cargarCitas();