// ==========================================
// SEGURIDAD Y CONTROL DE ACCESO
// ==========================================
const token = localStorage.getItem('jwtToken');
const roles = JSON.parse(localStorage.getItem('userRoles') || '[]');

if (!token || !roles.includes('ROLE_ADMIN')) {
    alert('Acceso denegado. No tienes permisos de Administrador.');
    window.location.href = 'index.html';
}

const payload = JSON.parse(atob(token.split('.')[1]));
document.getElementById('navUsername').textContent = `Admin: ${payload.sub}`;

// ==========================================
// CARGAR ESTADÍSTICAS EN TIEMPO REAL
// ==========================================
async function cargarEstadisticas() {
    try {
        const res = await fetch('http://localhost:8080/api/admin/estadisticas', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const stats = await res.json();
            document.getElementById('statMedicos').textContent = stats.medicos;
            document.getElementById('statEspecialidades').textContent = stats.especialidades;
            document.getElementById('statCitas').textContent = stats.citas;
        } else {
            document.getElementById('statMedicos').textContent = '-';
            document.getElementById('statEspecialidades').textContent = '-';
            document.getElementById('statCitas').textContent = '-';
        }
    } catch (error) {
        console.error("Error cargando estadísticas: ", error);
    }
}

// ==========================================
// CARGAR TABLA DE MÉDICOS
// ==========================================
async function cargarMedicos() {
    try {
        const response = await fetch('http://localhost:8080/api/medicos', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            const medicos = await response.json();
            renderizarTablaMedicos(medicos);
        } else {
            document.getElementById('tablaMedicosBody').innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar los datos</td></tr>';
        }
    } catch (error) {
        console.error("Error de conexión:", error);
    }
}

// Variable global para no tener que volver a consultar la BD al editar
let listaGlobalMedicos = []; 

async function cargarMedicos() {
    try {
        const response = await fetch('http://localhost:8080/api/medicos', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            listaGlobalMedicos = await response.json(); // Guardamos los datos
            renderizarTablaMedicos(listaGlobalMedicos);
        } else {
            document.getElementById('tablaMedicosBody').innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar los datos</td></tr>';
        }
    } catch (error) {
        console.error("Error de conexión:", error);
    }
}

function renderizarTablaMedicos(medicos) {
    const tbody = document.getElementById('tablaMedicosBody');
    let html = '';

    if (medicos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay médicos registrados en el sistema.</td></tr>';
        return;
    }

    medicos.forEach(m => {
        // Aseguramos capturar el ID correcto según lo envíe tu backend (id_medico o idMedico)
        const id = m.id_medico || m.idMedico; 
        
        html += `
            <tr>
                <td>${m.numeroDocumento}</td>
                <td class="fw-bold">${m.nombres} ${m.apellidos}</td>
                <td><span class="badge bg-info text-dark">${m.especialidad.nombreEspecialidad}</span></td>
                <td>${m.colegiaturaMedica}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="abrirModalEditar(${id})"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarMedico(${id})"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// ==========================================
// LÓGICA DEL MODAL: REGISTRAR MÉDICO
// ==========================================
document.getElementById('btnAbrirModalMedico').addEventListener('click', () => {
    const modal = new bootstrap.Modal(document.getElementById('modalMedico'));
    modal.show();
    cargarEspecialidadesParaAdmin();
});

async function cargarEspecialidadesParaAdmin() {
    try {
        const res = await fetch('http://localhost:8080/api/especialidades', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const especialidades = await res.json();
        
        const select = document.getElementById('medEspecialidad');
        select.innerHTML = '<option value="">Seleccione una especialidad...</option>';
        
        especialidades.forEach(e => {
            const id = e.id_especialidad || e.idEspecialidad; 
            select.innerHTML += `<option value="${id}">${e.nombreEspecialidad}</option>`;
        });
    } catch (error) {
        console.error("Error cargando especialidades: ", error);
    }
}

async function guardarMedico() {
    const btnGuardar = document.getElementById('btnGuardarMedico');
    
    const datos = {
        numeroDocumento: document.getElementById('medDni').value,
        colegiaturaMedica: document.getElementById('medCmp').value,
        nombres: document.getElementById('medNombres').value,
        apellidos: document.getElementById('medApellidos').value,
        idEspecialidad: parseInt(document.getElementById('medEspecialidad').value),
        telefono: document.getElementById('medTelefono').value,
        correo: document.getElementById('medCorreo').value
    };

    if(!datos.numeroDocumento || !datos.nombres || !datos.apellidos || !datos.idEspecialidad) {
        Swal.fire({ icon: 'warning', title: 'Datos faltantes', text: 'Por favor, complete los campos obligatorios.' });
        return;
    }

    btnGuardar.disabled = true;
    btnGuardar.innerHTML = "Guardando...";

    try {
        const res = await fetch('http://localhost:8080/api/medicos/registrar', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        if(res.ok) {
            await Swal.fire({ icon: 'success', title: '¡Registrado!', text: 'Médico guardado correctamente.', confirmButtonColor: '#212529' });
            window.location.reload(); 
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo registrar. Verifica que el DNI no esté duplicado.' });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error de red', text: 'No se pudo conectar con el servidor.' });
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = "Registrar Médico";
    }
}

// ==========================================
// CERRAR SESIÓN
// ==========================================
function cerrarSesion() {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userRoles');
    window.location.href = 'index.html';
}
// ==========================================
// ELIMINAR MÉDICO
// ==========================================
async function eliminarMedico(id) {
    const result = await Swal.fire({
        title: '¿Eliminar Médico?',
        text: "Esta acción no se puede deshacer.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, eliminar'
    });

    if (!result.isConfirmed) return;

    try {
        const res = await fetch(`http://localhost:8080/api/medicos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            Swal.fire('¡Eliminado!', 'El médico fue retirado del sistema.', 'success');
            cargarMedicos(); // Recarga la tabla sin recargar toda la página
            cargarEstadisticas();
        } else {
            const data = await res.json();
            Swal.fire('No permitido', data.mensaje, 'error'); // Muestra si tiene citas amarradas
        }
    } catch (error) {
        Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
    }
}

// ==========================================
// ABRIR MODAL DE EDICIÓN Y LLENAR DATOS
// ==========================================
async function abrirModalEditar(id) {
    // Buscar al médico en nuestra variable global
    const medico = listaGlobalMedicos.find(m => (m.id_medico || m.idMedico) === id);
    if (!medico) return;

    // Llenar el select de especialidades primero
    await cargarEspecialidadesParaEditar();

    // Inyectar los datos en el formulario
    document.getElementById('editMedId').value = id;
    document.getElementById('editMedDni').value = medico.numeroDocumento;
    document.getElementById('editMedCmp').value = medico.colegiaturaMedica;
    document.getElementById('editMedNombres').value = medico.nombres;
    document.getElementById('editMedApellidos').value = medico.apellidos;
    document.getElementById('editMedTelefono').value = medico.telefono || '';
    document.getElementById('editMedCorreo').value = medico.correo || '';
    
    // Seleccionar la especialidad correcta
    const idEspecialidad = medico.especialidad.id_especialidad || medico.especialidad.idEspecialidad;
    document.getElementById('editMedEspecialidad').value = idEspecialidad;

    // Mostrar el modal
    const modal = new bootstrap.Modal(document.getElementById('modalEditarMedico'));
    modal.show();
}

async function cargarEspecialidadesParaEditar() {
    try {
        const res = await fetch('http://localhost:8080/api/especialidades', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const especialidades = await res.json();
        const select = document.getElementById('editMedEspecialidad');
        select.innerHTML = '<option value="">Seleccione una especialidad...</option>';
        especialidades.forEach(e => {
            const id = e.id_especialidad || e.idEspecialidad; 
            select.innerHTML += `<option value="${id}">${e.nombreEspecialidad}</option>`;
        });
    } catch (error) {
        console.error("Error cargando especialidades");
    }
}

// ==========================================
// GUARDAR LOS CAMBIOS EDITADOS
// ==========================================
async function actualizarMedico() {
    const id = document.getElementById('editMedId').value;
    const btnGuardar = document.getElementById('btnActualizarMedico');
    
    const datos = {
        numeroDocumento: document.getElementById('editMedDni').value,
        colegiaturaMedica: document.getElementById('editMedCmp').value,
        nombres: document.getElementById('editMedNombres').value,
        apellidos: document.getElementById('editMedApellidos').value,
        idEspecialidad: parseInt(document.getElementById('editMedEspecialidad').value),
        telefono: document.getElementById('editMedTelefono').value,
        correo: document.getElementById('editMedCorreo').value
    };

    btnGuardar.disabled = true;
    btnGuardar.innerHTML = "Actualizando...";

    try {
        const res = await fetch(`http://localhost:8080/api/medicos/${id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        if (res.ok) {
            await Swal.fire('¡Actualizado!', 'Los datos se guardaron correctamente.', 'success');
            window.location.reload(); 
        } else {
            Swal.fire('Error', 'No se pudo actualizar la información.', 'error');
        }
    } catch (error) {
        Swal.fire('Error de red', 'No se pudo conectar con el servidor.', 'error');
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = "Guardar Cambios";
    }
}

// Inicializar panel
cargarMedicos();
cargarEstadisticas();

// ==========================================
// DESCARGAR REPORTE PDF
// ==========================================
async function descargarReportePdf() {
    try {
        Swal.fire({
            title: 'Generando PDF...',
            text: 'Por favor espera un momento.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading() }
        });

        const res = await fetch('http://localhost:8080/api/admin/reporte/citas', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            // Convertimos la respuesta en un archivo binario (Blob)
            const blob = await res.blob();
            // Creamos un enlace temporal para descargarlo
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Historial_Citas_SaludPlus.pdf';
            document.body.appendChild(a);
            a.click();
            a.remove();

            Swal.close();
        } else {
            Swal.fire('Error', 'No se pudo generar el reporte en este momento.', 'error');
        }
    } catch (error) {
        Swal.fire('Error de conexión', 'No se pudo conectar con el servidor.', 'error');
    }
}