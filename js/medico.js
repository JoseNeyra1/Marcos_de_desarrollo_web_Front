// ==========================================
// SEGURIDAD Y CONTROL DE ACCESO
// ==========================================
const token = localStorage.getItem('jwtToken');
const roles = JSON.parse(localStorage.getItem('userRoles') || '[]');

// Si no hay token o el usuario NO tiene el rol de MÉDICO, lo saca de la pantalla
if (!token || !roles.includes('ROLE_MEDICO')) {
    alert('Acceso denegado. No tienes permisos de Personal Médico.');
    window.location.href = 'index.html';
}

const payload = JSON.parse(atob(token.split('.')[1]));
document.getElementById('navUsername').textContent = `Dr. ${payload.sub}`;
document.getElementById('doctorNombre').textContent = `Dr. ${payload.sub}`;

// ==========================================
// CARGAR CITAS DE LA AGENDA DEL DOCTOR
// ==========================================
async function cargarAgenda() {
    try {
        const response = await fetch('http://localhost:8080/api/citas/agenda-medico', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const citas = await response.json();
            renderizarTablaAgenda(citas);
        } else {
            document.getElementById('tablaAgendaBody').innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al obtener la agenda.</td></tr>';
        }
    } catch (error) {
        document.getElementById('tablaAgendaBody').innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error de conexión con el servidor.</td></tr>';
    }
}

function renderizarTablaAgenda(citas) {
    const tbody = document.getElementById('tablaAgendaBody');
    let html = '';

    if (citas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-muted">No registras pacientes programados en tu agenda.</td></tr>';
        return;
    }

    // Actualizamos dinámicamente la especialidad en la tarjeta lateral usando la primera cita
    document.getElementById('doctorEspecialidad').textContent = citas[0].medico.especialidad.nombreEspecialidad;

    citas.forEach(cita => {
        const fechaObj = new Date(cita.fechaHora);
        const horaFormat = fechaObj.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
        
        // Estilo visual del badge según el estado
        let badgeColor = 'bg-warning text-dark';
        if (cita.estado === 'Confirmada') badgeColor = 'bg-primary text-white';
        if (cita.estado === 'Atendida') badgeColor = 'bg-success text-white';
        if (cita.estado === 'Cancelada') badgeColor = 'bg-danger text-white';

        // El botón de atender solo aparece si la cita está en estado "Confirmada"
        let botonAccion = cita.estado === 'Confirmada' ? 
            `<button class="btn btn-sm btn-success" onclick="atenderPaciente(${cita.id_cita})"><i class="bi bi-check-circle"></i> Atender</button>` : 
            `<span class="text-muted"><i class="bi bi-dash-circle"></i> Sin acciones</span>`;

        html += `
            <tr>
                <td class="fw-bold text-secondary">${horaFormat}</td>
                <td>
                    <div class="fw-bold">${cita.paciente.nombres} ${cita.paciente.apellidos}</div>
                    <small class="text-muted">DNI: ${cita.paciente.numeroDocumento}</small>
                </td>
                <td><em class="text-muted">"${cita.motivoConsulta}"</em></td>
                <td><span class="badge ${badgeColor}">${cita.estado}</span></td>
                <td>${botonAccion}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// ==========================================
// MARCAR PACIENTE COMO ATENDIDO
// ==========================================
async function atenderPaciente(idCita) {
    if (!confirm("¿Desea registrar esta consulta médica como Finalizada/Atendida?")) return;

    try {
        const res = await fetch(`http://localhost:8080/api/citas/${idCita}/atender`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (res.ok) {
            alert("¡Consulta guardada con éxito!");
            window.location.reload(); // Recarga la agenda para ver los cambios
        } else {
            alert("No se pudo actualizar el estado de la consulta.");
        }
    } catch (error) {
        alert("Error de conexión con el servidor.");
    }
}

// ==========================================
// ACCIÓN DE SALIDA
// ==========================================
function cerrarSesion() {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userRoles');
    window.location.href = 'index.html';
}

// Arranca la carga de pacientes al abrir la ventana
cargarAgenda();