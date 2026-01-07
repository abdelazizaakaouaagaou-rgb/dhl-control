import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyA9w8bgR16u-ohUThbKqrpoFxGyif-6mI0",
    authDomain: "dhl-sistemas.firebaseapp.com",
    databaseURL: "https://dhl-sistemas-default-rtdb.firebaseio.com",
    projectId: "dhl-sistemas",
    storageBucket: "dhl-sistemas.firebasestorage.app",
    messagingSenderId: "167500803552",
    appId: "1:167500803552:web:dd8a75e082e184fc9d0f85"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dbRef = ref(db, 'registros_dhl_pro');
let appData = [];

// --- SEGURIDAD ---
document.getElementById('btnLogin').addEventListener('click', () => {
    if (document.getElementById('passInput').value === "DHL2025") {
        document.getElementById('loginOverlay').style.display = 'none';
        sessionStorage.setItem('dhl_auth', 'ok');
    } else {
        document.getElementById('errorPass').style.display = 'block';
    }
});
if(sessionStorage.getItem('dhl_auth') === 'ok') document.getElementById('loginOverlay').style.display = 'none';

// --- BUSCADOR ---
document.getElementById('buscadorNombre').addEventListener('input', refreshUI);

// --- LÓGICA ---
function calcularSaldoDe(nombre) {
    let saldo = 0;
    appData.forEach(r => {
        if (r.nombre.toLowerCase() === nombre.toLowerCase()) {
            let factor = (r.tipo === "Festiva") ? 1.75 : 1;
            if (r.tipo === "Libranza") saldo -= parseFloat(r.horas);
            else saldo += (parseFloat(r.horas) * factor);
        }
    });
    return saldo;
}

onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    appData = data ? Object.keys(data).map(id => ({ id, ...data[id] })) : [];
    refreshUI();
});

function refreshUI() {
    const tableBody = document.getElementById('tableBody');
    const filtro = document.getElementById('buscadorNombre').value.toLowerCase();
    tableBody.innerHTML = "";
    let tG = 0, tL = 0;
    
    appData.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    let saldosPersonales = {};

    appData.forEach(r => {
        let factor = (r.tipo === "Festiva") ? 1.75 : 1;
        let entra = r.tipo !== "Libranza" ? r.horas * factor : 0;
        let sale = r.tipo === "Libranza" ? r.horas : 0;
        
        let n = r.nombre.toLowerCase();
        saldosPersonales[n] = (saldosPersonales[n] || 0) + (entra - sale);

        // Si el registro coincide con el buscador o si el buscador está vacío
        if (r.nombre.toLowerCase().includes(filtro)) {
            tG += entra; tL += sale;
            tableBody.innerHTML += `
                <tr>
                    <td><strong>${r.nombre.toUpperCase()}</strong></td>
                    <td>${r.tipo}</td>
                    <td>${r.fecha}</td>
                    <td style="color:green">+${entra.toFixed(1)}</td>
                    <td style="color:red">${sale > 0 ? '-' + sale.toFixed(1) : '-'}</td>
                    <td><strong>${saldosPersonales[n].toFixed(1)}h</strong></td>
                    <td class="comentario-celda">${r.comentario || ''}</td>
                    <td><button onclick="window.del('${r.id}')" style="cursor:pointer; border:none; background:none;">🗑️</button></td>
                </tr>`;
        }
    });
    
    document.getElementById('totalGanadas').innerText = tG.toFixed(1);
    document.getElementById('totalLibradas').innerText = tL.toFixed(1);
    document.getElementById('totalSaldo').innerText = (tG - tL).toFixed(1);
}

document.getElementById('btnGuardar').addEventListener('click', () => {
    const nombre = document.getElementById('nombre').value.trim();
    const fecha = document.getElementById('fecha').value;
    const tipo = document.getElementById('tipoHora').value;
    const horas = parseFloat(document.getElementById('cantidad').value);
    const comentario = document.getElementById('comentario').value.trim();
    const msg = document.getElementById('mensajeAlerta');

    if(!nombre || !fecha || isNaN(horas)) return alert("⚠️ Rellena los campos obligatorios.");

    if (tipo === "Libranza") {
        const saldoDisp = calcularSaldoDe(nombre);
        if (horas > saldoDisp) {
            msg.innerText = `🚫 SALDO INSUFICIENTE PARA LIBRAR (${saldoDisp.toFixed(1)}h)`;
            msg.style.display = "block";
            return;
        }
    }

    push(dbRef, { nombre, fecha, tipo, horas, comentario });
    document.getElementById('cantidad').value = "";
    document.getElementById('comentario').value = "";
    msg.style.display = "none";
});

window.del = (id) => { if(confirm("¿Eliminar registro?")) remove(ref(db, `registros_dhl_pro/${id}`)); };

document.getElementById('btnExportar').addEventListener('click', () => {
    const filtro = document.getElementById('buscadorNombre').value.toLowerCase();
    let csv = "Empleado,Fecha,Concepto,Horas,Calculadas,Comentarios\n";
    
    appData.forEach(r => {
        if (r.nombre.toLowerCase().includes(filtro)) {
            let f = (r.tipo === "Festiva") ? 1.75 : 1;
            let c = r.tipo === "Libranza" ? -r.horas : r.horas * f;
            csv += `${r.nombre},${r.fecha},${r.tipo},${r.horas},${c},${r.comentario || ''}\n`;
        }
    });
    
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filtro ? `DHL_Reporte_${filtro}.csv` : "DHL_Reporte_General.csv";
    a.click();
});