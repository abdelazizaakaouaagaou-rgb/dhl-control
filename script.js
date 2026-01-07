import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// CONFIGURACIÓN REAL DE TU PROYECTO (Extraída de tu imagen)
const firebaseConfig = {
  apiKey: "AIzaSyA9w8bgR16u-ohUThbKqrpoFxGyif-6mI0",
  authDomain: "dhl-sistemas.firebaseapp.com",
  databaseURL: "https://dhl-sistemas-default-rtdb.firebaseio.com",
  projectId: "dhl-sistemas",
  storageBucket: "dhl-sistemas.firebaseasestorage.app",
  messagingSenderId: "167500803552",
  appId: "1:167500803552:web:dd8a75e082e184fc9d0f85"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dbRef = ref(db, 'registros_dhl');

let appData = [];

// Función para calcular saldo por nombre
function calcularSaldoDe(nombre) {
    let saldo = 0;
    appData.forEach(r => {
        if (r.nombre.toLowerCase() === nombre.toLowerCase()) {
            let factor = (r.tipo === "Festiva" || r.tipo === "ExtraFestiva") ? 1.75 : 1;
            if (r.tipo === "Libranza") saldo -= parseFloat(r.horas);
            else saldo += (parseFloat(r.horas) * factor);
        }
    });
    return saldo;
}

// Escuchar cambios en la nube
onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    appData = [];
    if (data) {
        Object.keys(data).forEach(id => {
            appData.push({ idFirebase: id, ...data[id] });
        });
    }
    refreshUI();
});

function refreshUI() {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = "";
    let totalG = 0; let totalL = 0;
    
    appData.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    let saldosTemporales = {};

    appData.forEach((rec) => {
        let factor = (rec.tipo === "Festiva" || rec.tipo === "ExtraFestiva") ? 1.75 : 1;
        let entra = rec.tipo !== "Libranza" ? rec.horas * factor : 0;
        let sale = rec.tipo === "Libranza" ? rec.horas : 0;
        totalG += entra; totalL += sale;

        let n = rec.nombre.toLowerCase();
        saldosTemporales[n] = (saldosTemporales[n] || 0) + (entra - sale);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${rec.nombre.toUpperCase()}</strong></td>
            <td>${rec.fecha}</td>
            <td>${rec.tipo}</td>
            <td class="text-green">${entra > 0 ? '+' + entra.toFixed(2) : '-'}</td>
            <td class="text-red">${sale > 0 ? '-' + sale.toFixed(2) : '-'}</td>
            <td style="background:#f9f9f9"><strong>${saldosTemporales[n].toFixed(2)} h</strong></td>
            <td><button onclick="eliminarRegistro('${rec.idFirebase}')">🗑️</button></td>
        `;
        tableBody.prepend(tr);
    });

    document.getElementById('totalGanadas').innerText = totalG.toFixed(2);
    document.getElementById('totalLibradas').innerText = totalL.toFixed(2);
    document.getElementById('totalSaldo').innerText = (totalG - totalL).toFixed(2);
}

document.getElementById('btnGuardar').addEventListener('click', () => {
    const nombre = document.getElementById('nombre').value.trim();
    const fecha = document.getElementById('fecha').value;
    const tipo = document.getElementById('tipoHora').value;
    const horas = parseFloat(document.getElementById('cantidad').value);
    const msgAlerta = document.getElementById('mensajeAlerta');

    if (!nombre || !fecha || isNaN(horas)) return alert("⚠️ Faltan datos.");

    if (tipo === "Libranza") {
        const saldoAct = calcularSaldoDe(nombre);
        if (horas > saldoAct) {
            msgAlerta.innerText = `🚫 BLOQUEO: SALDO INSUFICIENTE (${saldoAct.toFixed(2)}h)`;
            msgAlerta.style.display = "block";
            return;
        }
    }

    push(dbRef, { nombre, fecha, tipo, horas });
    document.getElementById('cantidad').value = "";
    msgAlerta.style.display = "none";
});

window.eliminarRegistro = (id) => {
    if(confirm("¿Eliminar registro de la nube?")) {
        const itemRef = ref(db, `registros_dhl/${id}`);
        remove(itemRef);
    }
};

document.getElementById('btnExportar').addEventListener('click', () => {
    let csv = "Empleado,Fecha,Tipo,Horas Reales,Horas Calculadas\n";
    appData.forEach(r => {
        let f = (r.tipo === "Festiva" || r.tipo === "ExtraFestiva") ? 1.75 : 1;
        let c = r.tipo === "Libranza" ? -r.horas : r.horas * f;
        csv += `${r.nombre},${r.fecha},${r.tipo},${r.horas},${c.toFixed(2)}\n`;
    });
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Reporte_DHL_Cloud.csv";
    link.click();
});

document.getElementById('btnLimpiar').addEventListener('click', () => {
    if(confirm("¿BORRAR TODO EL HISTORIAL DE LA NUBE?")) remove(dbRef);
});