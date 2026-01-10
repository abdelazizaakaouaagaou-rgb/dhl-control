import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAlvAjkgoNB93HMgeV4UoZsNCi_q6kBy9c",
  authDomain: "titan-hub-cloud.firebaseapp.com",
  databaseURL: "https://titan-hub-cloud-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "titan-hub-cloud",
  storageBucket: "titan-hub-cloud.firebasestorage.app",
  messagingSenderId: "620485722056",
  appId: "1:620485722056:web:c3effc37049ea9948f0afd"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dbRef = ref(db, 'atletas_pro');
let filtroActual = 'todos';

// FUNCIONES DE CONTROL
window.updateData = (id, campo, valor) => update(ref(db, `atletas_pro/${id}`), { [campo]: valor });
window.borrar = (id) => confirm("¿Eliminar definitivamente?") && remove(ref(db, `atletas_pro/${id}`));
window.setFiltro = (f) => { filtroActual = f; render(); };

window.enviarWhatsApp = (nombre, tel, plan) => {
    const msg = encodeURIComponent(`Hola ${nombre}! Tu entrenamiento para hoy: ${plan}`);
    window.open(`https://api.whatsapp.com/send?phone=${tel}&text=${msg}`);
};

// MOTOR DE RENDERIZADO
window.render = () => {
    onValue(dbRef, (snapshot) => {
        const list = document.getElementById('atletaList');
        const search = document.getElementById('busqueda').value.toLowerCase();
        list.innerHTML = "";
        let kpi = { total: 0, ok: 0, deuda: 0 };

        snapshot.forEach((child) => {
            const a = child.val();
            if(!a.nombre.toLowerCase().includes(search)) return;
            if(filtroActual === 'pagos' && a.pago === 'PAGADO') return;

            kpi.total++;
            if(a.check) kpi.ok++;
            if(a.pago === 'PENDIENTE') kpi.deuda += 50;

            list.innerHTML += `
                <tr>
                    <td><strong>${a.nombre.toUpperCase()}</strong></td>
                    <td><button class="btn-wa" onclick="window.enviarWhatsApp('${a.nombre}','${a.tel}','${a.plan}')">📞</button></td>
                    <td><input class="plan-input" value="${a.plan}" onchange="window.updateData('${child.key}', 'plan', this.value)"></td>
                    <td><button class="status-pill ${a.pago}" onclick="window.updateData('${child.key}','pago','${a.pago==='PAGADO'?'PENDIENTE':'PAGADO'}')">${a.pago}</button></td>
                    <td><button onclick="window.updateData('${child.key}','check', ${!a.check})" style="background:none; border:none; cursor:pointer; font-size:1.5rem">${a.check ? '✅' : '⚪'}</button></td>
                    <td><button onclick="window.borrar('${child.key}')" style="color:#333; border:none; background:none; cursor:pointer">🗑️</button></td>
                </tr>`;
        });
        document.getElementById('totalAtletas').innerText = kpi.total;
        document.getElementById('totalCheckin').innerText = kpi.ok;
        document.getElementById('totalDeuda').innerText = kpi.deuda + "€";
    });
};

document.getElementById('btnNuevo').onclick = () => {
    const n = prompt("Nombre:");
    const t = prompt("Teléfono (con código país, ej: 34600...):");
    if(n && t) push(dbRef, { nombre: n, tel: t, plan: "Pendiente", pago: "PENDIENTE", check: false });
};

render();