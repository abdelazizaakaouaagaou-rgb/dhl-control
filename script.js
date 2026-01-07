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
const dbRef = ref(db, 'registros_dhl');

let appData = [];

// --- SISTEMA DE SEGURIDAD ---
const CLAVE_SISTEMA = "DHL"; // 🔑 PUEDES CAMBIAR ESTA CLAVE

document.getElementById('btnLogin').addEventListener('click', () => {
    const input = document.getElementById('passInput').value;
    if (input === CLAVE_SISTEMA) {
        document.getElementById('loginOverlay').style.display = 'none';
        sessionStorage.setItem('auth_dhl', 'ok');
    } else {
        document.getElementById('errorPass').style.display = 'block';
    }
});

window.addEventListener('load', () => {
    if(sessionStorage.getItem('auth_dhl') === 'ok') {
        document.getElementById('loginOverlay').style.display = 'none';
    }
});

// --- LÓGICA DE NEGOCIO ---
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
        let f = (rec.tipo === "Festiva" || rec.tipo === "ExtraFestiva") ? 1.75 : 1;
        let e = rec.tipo !== "Libranza" ? rec.horas * f : 0;
        let s = rec.tipo === "Libranza" ? rec.horas : 0;
        totalG += e; totalL += s;
        let n = rec.nombre.toLowerCase();
        saldosTemporales[n] = (saldosTemporales[n] || 0) + (e - s);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${rec.nombre.toUpperCase()}</strong></td>
            <td>${rec.fecha}</td>
            <td>${rec.tipo}</td>
            <td class="text-green">${e > 0 ? '+' + e.toFixed(2) : '-'}</td>
            <td class="text-red">${s > 0 ? '-' + s.toFixed(2) : '-'}</td>
            <td style="background:#f9f9f9"><strong>${saldosTemporales[n].toFixed(2)} h</strong></td>
            <td><button onclick="eliminarRegistro('${rec.idFirebase}')" style="border:none; background:none; cursor:pointer;">🗑️</button></td>
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
    const msg = document.getElementById('mensajeAlerta');

    if (!nombre || !fecha || isNaN(horas)) return alert("Faltan datos");

    if (tipo === "Libranza") {
        const saldoAct = calcularSaldoDe(nombre);
        if (horas > saldoAct) {
            msg.innerText = `🚫 BLOQUEO: SALDO INSUFICIENTE (${saldoAct.toFixed(2)}h)`;
            msg.style.display = "block";
            return;
        }
    }
    push(dbRef, { nombre, fecha, tipo, horas });
    document.getElementById('cantidad').value = "";
    msg.style.display = "none";
});

window.eliminarRegistro = (id) => {
    if(confirm("¿Eliminar registro?")) remove(ref(db, `registros_dhl/${id}`));
};

document.getElementById('btnExportar').addEventListener('click', () => {
    let csv = "Empleado,Fecha,Tipo,Horas Reales,Horas Calculadas\n";
    appData.forEach(r => {
        let f = (r.tipo === "Festiva" || r.tipo === "ExtraFestiva") ? 1.75 : 1;
        let c = r.tipo === "Libranza" ? -r.horas : r.horas * f;
        csv += `${r.nombre},${r.fecha},${r.tipo},${r.horas},${c.toFixed(2)}\n`;
    });
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "Reporte_DHL.csv";
    a.click();
});

document.getElementById('btnLimpiar').addEventListener('click', () => {
    if(confirm("¿BORRAR TODO?")) remove(dbRef);
});