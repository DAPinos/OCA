'use strict';
(function(){
  // Pub/Sub
  const events = document.createElement('div');
  const emit = (name, detail={}) => events.dispatchEvent(new CustomEvent(name,{detail}));
  const on = (name, handler) => events.addEventListener(name, handler);

  // Storage keys
  const KEYS = {
    employees: 'hr_employees',
    attendance: 'hr_attendance',
    vacations: 'hr_vacations',
    payroll: 'hr_payroll',
    evaluations: 'hr_evaluations',
    documents: 'hr_documents',
    settings: 'hr_settings',
    role: 'hr_role'
  };

  // Adapter API (can be replaced by real REST client later)
  const HRApi = {
    // Employees
    listEmployees(){ return JSON.parse(localStorage.getItem(KEYS.employees)||'[]'); },
    saveEmployees(arr){ localStorage.setItem(KEYS.employees, JSON.stringify(arr)); emit('employees:changed'); },

    // Attendance
    listAttendance(){ return JSON.parse(localStorage.getItem(KEYS.attendance)||'[]'); },
    saveAttendance(arr){ localStorage.setItem(KEYS.attendance, JSON.stringify(arr)); emit('attendance:changed'); },

    // Vacations
    listVacations(){ return JSON.parse(localStorage.getItem(KEYS.vacations)||'[]'); },
    saveVacations(arr){ localStorage.setItem(KEYS.vacations, JSON.stringify(arr)); emit('vacations:changed'); },

    // Payroll
    listPayroll(){ return JSON.parse(localStorage.getItem(KEYS.payroll)||'[]'); },
    savePayroll(arr){ localStorage.setItem(KEYS.payroll, JSON.stringify(arr)); emit('payroll:changed'); },

    // Evaluations
    listEvaluations(){ return JSON.parse(localStorage.getItem(KEYS.evaluations)||'[]'); },
    saveEvaluations(arr){ localStorage.setItem(KEYS.evaluations, JSON.stringify(arr)); emit('evaluations:changed'); },

    // Documents
    listDocuments(){ return JSON.parse(localStorage.getItem(KEYS.documents)||'[]'); },
    saveDocuments(arr){ localStorage.setItem(KEYS.documents, JSON.stringify(arr)); emit('documents:changed'); },

    // Settings
    getSettings(){ return JSON.parse(localStorage.getItem(KEYS.settings)||'{"vacationDays":15,"hoursPerDay":8}'); },
    saveSettings(s){ localStorage.setItem(KEYS.settings, JSON.stringify(s)); emit('settings:changed'); },

    getRole(){ return localStorage.getItem(KEYS.role)||'RRHH'; },
    setRole(r){ localStorage.setItem(KEYS.role, r); emit('role:changed'); }
  };
  window.HRApi = HRApi;

  // Utilities
  const uid = (p='id') => p+'_'+Date.now()+'_'+Math.floor(Math.random()*9999);
  const formatMoney = (n)=> typeof window.formatCurrency==='function'? window.formatCurrency(n) : (Number(n)||0).toFixed(0);
  const toast = (msg, type='success') => {
    const box = document.createElement('div');
    box.className = `px-4 py-2 rounded-lg shadow text-white ${type==='error'?'bg-red-600':'bg-green-600'}`;
    box.textContent = msg;
    document.getElementById('toastContainer')?.appendChild(box);
    setTimeout(()=>box.remove(), 3000);
  };

  // Navigation between sections
  function setupNavigation(){
    const links = document.querySelectorAll('#sideNav a');
    links.forEach(a=>{
      a.addEventListener('click', (e)=>{
        e.preventDefault();
        links.forEach(x=>x.classList.remove('active'));
        a.classList.add('active');
        const section = a.dataset.section;
        document.querySelectorAll('main > section').forEach(s=>s.classList.add('hidden'));
        document.getElementById('section-'+section)?.classList.remove('hidden');
        emit('section:changed', {section});
      });
    });
  }

  // Employees Module
  function renderEmployees(){
    const tbody = document.querySelector('#empTable tbody');
    const search = document.getElementById('empSearch').value.trim().toLowerCase();
    const dept = document.getElementById('empDeptFilter').value;
    const status = document.getElementById('empStatusFilter').value;
    const data = HRApi.listEmployees()
      .filter(e=>!search || (e.firstName+' '+e.lastName+' '+(e.nationalId||'')+' '+(e.position||'')+' '+(e.department||'')).toLowerCase().includes(search))
      .filter(e=>!dept || e.department===dept)
      .filter(e=>!status || e.status===status);
    tbody.innerHTML = data.map(e=>{
      const fullName = `${e.firstName||''} ${e.lastName||''}`.trim();
      const salary = formatMoney(e.salary||0);
      const photo = e.photo || 'https://via.placeholder.com/40';
      const inDate = e.hireDate ? new Date(e.hireDate).toLocaleDateString('es-CL') : '-';
      return `<tr>
        <td class="p-2"><img src="${photo}" alt="Foto" class="w-10 h-10 rounded object-cover"/></td>
        <td class="p-2">${fullName}</td>
        <td class="p-2">${e.nationalId||''}</td>
        <td class="p-2">${e.position||''}</td>
        <td class="p-2">${e.department||''}</td>
        <td class="p-2">${inDate}</td>
        <td class="p-2">${salary}</td>
        <td class="p-2"><span class="pill">${e.status||'activo'}</span></td>
        <td class="p-2 text-right">
          <button class="text-blue-700 mr-2" data-act="edit" data-id="${e.id}">Editar</button>
          <button class="text-red-700" data-act="del" data-id="${e.id}">Borrar</button>
        </td>
      </tr>`;
    }).join('');

    // actions
    tbody.querySelectorAll('button[data-act]')?.forEach(btn=>{
      btn.addEventListener('click', (ev)=>{
        const id = ev.currentTarget.getAttribute('data-id');
        const act = ev.currentTarget.getAttribute('data-act');
        if(act==='edit') openEmployeeModal(HRApi.listEmployees().find(x=>x.id===id));
        else if(act==='del') deleteEmployee(id);
      });
    });
  }

  function openEmployeeModal(emp){
    const readOnly = (HRApi.getRole()!=='RRHH');
    const m = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    const title = emp? 'Editar empleado' : 'Nuevo empleado';
    box.innerHTML = `
      <div class="p-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-xl font-semibold">${title}</h3>
          <button id="closeModal" class="text-gray-500">✕</button>
        </div>
        <form id="empForm" class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="text-sm">Nombre</label>
            <input name="firstName" class="border rounded-lg p-2 w-full" ${readOnly?'disabled':''} value="${emp?.firstName||''}" required />
          </div>
          <div>
            <label class="text-sm">Apellido</label>
            <input name="lastName" class="border rounded-lg p-2 w-full" ${readOnly?'disabled':''} value="${emp?.lastName||''}" required />
          </div>
          <div>
            <label class="text-sm">RUT/DNI</label>
            <input name="nationalId" class="border rounded-lg p-2 w-full" ${readOnly?'disabled':''} value="${emp?.nationalId||''}" required />
          </div>
          <div>
            <label class="text-sm">Fecha de nacimiento</label>
            <input type="date" name="birthDate" class="border rounded-lg p-2 w-full" ${readOnly?'disabled':''} value="${emp?.birthDate||''}" />
          </div>
          <div>
            <label class="text-sm">Puesto</label>
            <input name="position" class="border rounded-lg p-2 w-full" ${readOnly?'disabled':''} value="${emp?.position||''}" />
          </div>
          <div>
            <label class="text-sm">Área/Departamento</label>
            <input name="department" class="border rounded-lg p-2 w-full" ${readOnly?'disabled':''} value="${emp?.department||''}" />
          </div>
          <div>
            <label class="text-sm">Fecha de ingreso</label>
            <input type="date" name="hireDate" class="border rounded-lg p-2 w-full" ${readOnly?'disabled':''} value="${emp?.hireDate||''}" />
          </div>
          <div>
            <label class="text-sm">Salario</label>
            <input type="number" min="0" step="0.01" name="salary" class="border rounded-lg p-2 w-full" ${readOnly?'disabled':''} value="${emp?.salary||''}" />
          </div>
          <div>
            <label class="text-sm">Tipo de contrato</label>
            <select name="contractType" class="border rounded-lg p-2 w-full" ${readOnly?'disabled':''}>
              <option value="indefinido" ${emp?.contractType==='indefinido'?'selected':''}>Indefinido</option>
              <option value="plazo_fijo" ${emp?.contractType==='plazo_fijo'?'selected':''}>Plazo fijo</option>
              <option value="part_time" ${emp?.contractType==='part_time'?'selected':''}>Part-time</option>
            </select>
          </div>
          <div>
            <label class="text-sm">Estado</label>
            <select name="status" class="border rounded-lg p-2 w-full" ${readOnly?'disabled':''}>
              <option value="activo" ${emp?.status==='activo'?'selected':''}>Activo</option>
              <option value="inactivo" ${emp?.status==='inactivo'?'selected':''}>Inactivo</option>
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="text-sm block mb-1">Foto de perfil</label>
            <input type="file" accept="image/*" id="empPhotoInput" ${readOnly?'disabled':''} />
            <div class="mt-2">
              <img id="empPhotoPreview" src="${emp?.photo||'https://via.placeholder.com/120'}" alt="Foto" class="w-24 h-24 rounded object-cover border"/>
            </div>
          </div>
          ${readOnly?'<div class="md:col-span-2 text-sm text-gray-500">Rol actual no permite editar</div>':''}
          <div class="md:col-span-2 flex justify-end gap-2 mt-2">
            <button type="button" id="cancelEmp" class="border rounded-lg px-3 py-2">Cancelar</button>
            ${readOnly?'': '<button type="submit" class="bg-[var(--brand)] text-white rounded-lg px-3 py-2">Guardar</button>'}
          </div>
        </form>
      </div>`;
    m.classList.remove('hidden');

    box.querySelector('#closeModal').onclick = ()=> m.classList.add('hidden');
    box.querySelector('#cancelEmp').onclick = ()=> m.classList.add('hidden');

    const fileInput = box.querySelector('#empPhotoInput');
    if(fileInput){
      fileInput.addEventListener('change', (e)=>{
        const f = e.target.files?.[0]; if(!f) return;
        const reader = new FileReader();
        reader.onload = ()=>{ box.querySelector('#empPhotoPreview').src = reader.result; };
        reader.readAsDataURL(f);
      });
    }

    box.querySelector('#empForm')?.addEventListener('submit', (ev)=>{
      ev.preventDefault();
      const data = Object.fromEntries(new FormData(ev.currentTarget));
      const list = HRApi.listEmployees();
      if(emp){
        const idx = list.findIndex(x=>x.id===emp.id);
        list[idx] = { ...emp, ...data, salary: Number(data.salary)||0, photo: box.querySelector('#empPhotoPreview').src };
      } else {
        list.push({ id: uid('emp'), ...data, salary: Number(data.salary)||0, status: data.status||'activo', photo: box.querySelector('#empPhotoPreview').src });
      }
      HRApi.saveEmployees(list);
      m.classList.add('hidden');
      toast('Empleado guardado');
      updateEmployeesFilters();
      renderEmployees();
      updateKPIs();
    });
  }

  function deleteEmployee(id){
    if(HRApi.getRole()!=='RRHH') return toast('Sin permisos','error');
    const list = HRApi.listEmployees().filter(e=>e.id!==id);
    HRApi.saveEmployees(list);
    toast('Empleado eliminado');
    renderEmployees();
    updateKPIs();
  }

  function updateEmployeesFilters(){
    const deptSel = document.getElementById('empDeptFilter');
    const set = new Set(HRApi.listEmployees().map(e=>e.department).filter(Boolean));
    deptSel.innerHTML = '<option value="">Todos los departamentos</option>' + [...set].map(d=>`<option value="${d}">${d}</option>`).join('');
  }

  // Attendance
  function checkIn(){
    const empId = document.getElementById('attEmployee').value; if(!empId) return toast('Seleccione empleado','error');
    const day = (document.getElementById('attDate').value|| new Date().toISOString().slice(0,10));
    const list = HRApi.listAttendance();
    list.push({ id: uid('att'), empId, date: day, in: new Date().toISOString(), out: null, hours: 0 });
    HRApi.saveAttendance(list);
    toast('Entrada registrada');
    renderAttendance();
  }
  function checkOut(){
    const empId = document.getElementById('attEmployee').value; if(!empId) return toast('Seleccione empleado','error');
    const day = (document.getElementById('attDate').value|| new Date().toISOString().slice(0,10));
    const list = HRApi.listAttendance();
    const rec = [...list].reverse().find(r=>r.empId===empId && r.date===day && !r.out);
    if(!rec) return toast('No hay entrada para cerrar','error');
    rec.out = new Date().toISOString();
    const hours = (new Date(rec.out) - new Date(rec.in)) / 36e5;
    rec.hours = Math.max(0, Math.round(hours*100)/100);
    HRApi.saveAttendance(list);
    toast('Salida registrada');
    renderAttendance();
  }
  function renderAttendance(){
    const tbody = document.querySelector('#attTable tbody');
    const day = (document.getElementById('attDate').value|| new Date().toISOString().slice(0,10));
    const employees = HRApi.listEmployees();
    const rows = HRApi.listAttendance().filter(r=>r.date===day).map(r=>{
      const emp = employees.find(e=>e.id===r.empId);
      const name = emp? (emp.firstName+' '+emp.lastName) : r.empId;
      return `<tr>
        <td class="p-2">${new Date(r.date).toLocaleDateString('es-CL')}</td>
        <td class="p-2">${name}</td>
        <td class="p-2">${r.in? new Date(r.in).toLocaleTimeString('es-CL'): '-'}</td>
        <td class="p-2">${r.out? new Date(r.out).toLocaleTimeString('es-CL'): '-'}</td>
        <td class="p-2">${r.hours||0}</td>
      </tr>`;
    }).join('');
    tbody.innerHTML = rows || '<tr><td colspan="5" class="p-3 text-center text-gray-500">Sin registros</td></tr>';

    // Populate employee select
    const sel = document.getElementById('attEmployee');
    sel.innerHTML = '<option value="">Seleccione empleado</option>' + HRApi.listEmployees().map(e=>`<option value="${e.id}">${e.firstName} ${e.lastName}</option>`).join('');
  }

  // Vacations
  function openVacationModal(v){
    const readOnly = (HRApi.getRole()==='Viewer');
    const m = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    box.innerHTML = `
      <div class="p-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-xl font-semibold">${v? 'Editar solicitud' : 'Nueva solicitud'}</h3>
          <button id="closeModal" class="text-gray-500">✕</button>
        </div>
        <form id="vacForm" class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="text-sm">Empleado</label>
            <select name="empId" class="border rounded-lg p-2 w-full" ${readOnly?'disabled':''} required>
              ${HRApi.listEmployees().map(e=>`<option value="${e.id}" ${v?.empId===e.id?'selected':''}>${e.firstName} ${e.lastName}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="text-sm">Tipo</label>
            <select name="type" class="border rounded-lg p-2 w-full" ${readOnly?'disabled':''}>
              <option value="vacaciones" ${v?.type==='vacaciones'?'selected':''}>Vacaciones</option>
              <option value="licencia" ${v?.type==='licencia'?'selected':''}>Licencia</option>
            </select>
          </div>
          <div>
            <label class="text-sm">Desde</label>
            <input type="date" name="from" class="border rounded-lg p-2 w-full" ${readOnly?'disabled':''} value="${v?.from||''}" />
          </div>
          <div>
            <label class="text-sm">Hasta</label>
            <input type="date" name="to" class="border rounded-lg p-2 w-full" ${readOnly?'disabled':''} value="${v?.to||''}" />
          </div>
          <div>
            <label class="text-sm">Estado</label>
            <select name="status" class="border rounded-lg p-2 w-full" ${readOnly?'disabled':''}>
              <option value="pendiente" ${v?.status==='pendiente'?'selected':''}>Pendiente</option>
              <option value="aprobado" ${v?.status==='aprobado'?'selected':''}>Aprobado</option>
              <option value="rechazado" ${v?.status==='rechazado'?'selected':''}>Rechazado</option>
            </select>
          </div>
          ${readOnly?'<div class="md:col-span-2 text-sm text-gray-500">Rol actual no permite editar</div>':''}
          <div class="md:col-span-2 flex justify-end gap-2 mt-2">
            <button type="button" id="cancelVac" class="border rounded-lg px-3 py-2">Cancelar</button>
            ${readOnly?'':'<button type="submit" class="bg-[var(--brand)] text-white rounded-lg px-3 py-2">Guardar</button>'}
          </div>
        </form>
      </div>`;
    m.classList.remove('hidden');
    box.querySelector('#closeModal').onclick = ()=> m.classList.add('hidden');
    box.querySelector('#cancelVac').onclick = ()=> m.classList.add('hidden');

    box.querySelector('#vacForm')?.addEventListener('submit', (ev)=>{
      ev.preventDefault();
      const data = Object.fromEntries(new FormData(ev.currentTarget));
      const items = HRApi.listVacations();
      const days = Math.max(0, Math.ceil((new Date(data.to)-new Date(data.from))/86400000)+1);
      if(v){
        const idx = items.findIndex(x=>x.id===v.id);
        items[idx] = { ...v, ...data, days };
      } else {
        items.push({ id: uid('vac'), ...data, days, createdAt: new Date().toISOString() });
      }
      HRApi.saveVacations(items);
      m.classList.add('hidden');
      toast('Solicitud guardada');
      renderVacations();
    });
  }
  function renderVacations(){
    const tbody = document.querySelector('#vacTable tbody');
    const employees = HRApi.listEmployees();
    const rows = HRApi.listVacations().map(v=>{
      const emp = employees.find(e=>e.id===v.empId);
      const name = emp? (emp.firstName+' '+emp.lastName) : v.empId;
      return `<tr>
        <td class="p-2">${name}</td>
        <td class="p-2">${v.type}</td>
        <td class="p-2">${v.from}</td>
        <td class="p-2">${v.to}</td>
        <td class="p-2">${v.days}</td>
        <td class="p-2"><span class="pill">${v.status||'pendiente'}</span></td>
        <td class="p-2 text-right"><button class="text-blue-700" data-id="${v.id}">Editar</button></td>
      </tr>`;
    }).join('');
    tbody.innerHTML = rows || '<tr><td colspan="7" class="p-3 text-center text-gray-500">Sin solicitudes</td></tr>';
    tbody.querySelectorAll('button[data-id]')?.forEach(b=> b.onclick = ()=>{
      const v = HRApi.listVacations().find(x=>x.id===b.getAttribute('data-id'));
      openVacationModal(v);
    });
  }

  // Payroll
  function runPayroll(){
    const month = document.getElementById('payrollMonth').value || new Date().toISOString().slice(0,7);
    const employees = HRApi.listEmployees().filter(e=>e.status!=='inactivo');
    const attendance = HRApi.listAttendance().filter(r=> (r.in||'').startsWith(month) || (r.date||'').startsWith(month));
    const hoursByEmp = employees.reduce((acc,e)=>{ acc[e.id]=0; return acc; },{});
    attendance.forEach(r=>{ hoursByEmp[r.empId] = (hoursByEmp[r.empId]||0) + (Number(r.hours)||0); });
    const payroll = employees.map(e=>{
      const base = Number(e.salary)||0;
      const hours = hoursByEmp[e.id]||0;
      const standardHours = 160; // approx per month
      const variable = 0; // extend with bonuses if needed
      const discounts = 0; // extend with discounts if needed
      const total = base + variable - discounts;
      return { id: uid('pay'), month, empId: e.id, name: e.firstName+' '+e.lastName, base, hours, bonuses: variable, discounts, total };
    });
    HRApi.savePayroll(payroll);
    // Finance integration (egreso)
    try{
      const fm = JSON.parse(localStorage.getItem('finance_movements')||'[]');
      const amount = payroll.reduce((s,p)=> s + (Number(p.total)||0), 0);
      fm.push({ id: uid('fin'), type: 'egreso', category: 'Nómina', date: new Date().toISOString(), amount, notes: `Nómina ${month}` });
      localStorage.setItem('finance_movements', JSON.stringify(fm));
    }catch(_){/* ignore */}
    toast('Nómina calculada');
    renderPayroll();
    updateKPIs();
  }
  function renderPayroll(){
    const tbody = document.querySelector('#payrollTable tbody');
    const rows = HRApi.listPayroll().map(p=>{
      return `<tr>
        <td class="p-2">${p.name}</td>
        <td class="p-2">${formatMoney(p.base)}</td>
        <td class="p-2">${p.hours||0}</td>
        <td class="p-2">${formatMoney(p.bonuses||0)}</td>
        <td class="p-2">${formatMoney(p.discounts||0)}</td>
        <td class="p-2 font-semibold">${formatMoney(p.total||0)}</td>
      </tr>`;
    }).join('');
    tbody.innerHTML = rows || '<tr><td colspan="6" class="p-3 text-center text-gray-500">Sin cálculos</td></tr>';
  }

  // Evaluations
  function openEvalModal(evItem){
    const readOnly = (HRApi.getRole()==='Viewer');
    const m = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    box.innerHTML = `
      <div class="p-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-xl font-semibold">${evItem? 'Editar evaluación' : 'Nueva evaluación'}</h3>
          <button id="closeModal" class="text-gray-500">✕</button>
        </div>
        <form id="evalForm" class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="text-sm">Empleado</label>
            <select name="empId" class="border rounded-lg p-2 w-full" ${readOnly?'disabled':''}>
              ${HRApi.listEmployees().map(e=>`<option value="${e.id}" ${evItem?.empId===e.id?'selected':''}>${e.firstName} ${e.lastName}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="text-sm">Fecha</label>
            <input type="date" name="date" class="border rounded-lg p-2 w-full" ${readOnly?'disabled':''} value="${evItem?.date||''}" />
          </div>
          <div>
            <label class="text-sm">Puntaje</label>
            <input type="number" min="1" max="100" name="score" class="border rounded-lg p-2 w-full" ${readOnly?'disabled':''} value="${evItem?.score||''}" />
          </div>
          <div class="md:col-span-2">
            <label class="text-sm">Comentarios</label>
            <textarea name="comments" class="border rounded-lg p-2 w-full" rows="3" ${readOnly?'disabled':''}>${evItem?.comments||''}</textarea>
          </div>
          ${readOnly?'<div class="md:col-span-2 text-sm text-gray-500">Rol actual no permite editar</div>':''}
          <div class="md:col-span-2 flex justify-end gap-2 mt-2">
            <button type="button" id="cancelEval" class="border rounded-lg px-3 py-2">Cancelar</button>
            ${readOnly?'':'<button type="submit" class="bg-[var(--brand)] text-white rounded-lg px-3 py-2">Guardar</button>'}
          </div>
        </form>
      </div>`;
    m.classList.remove('hidden');
    box.querySelector('#closeModal').onclick = ()=> m.classList.add('hidden');
    box.querySelector('#cancelEval').onclick = ()=> m.classList.add('hidden');

    box.querySelector('#evalForm')?.addEventListener('submit', (e)=>{
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.currentTarget));
      const all = HRApi.listEvaluations();
      if(evItem){
        const idx = all.findIndex(x=>x.id===evItem.id);
        all[idx] = { ...evItem, ...data };
      } else {
        all.push({ id: uid('eval'), ...data });
      }
      HRApi.saveEvaluations(all);
      toast('Evaluación guardada');
      document.getElementById('modalOverlay').classList.add('hidden');
      renderEvaluations();
    });
  }
  function renderEvaluations(){
    const tbody = document.querySelector('#evalTable tbody');
    const employees = HRApi.listEmployees();
    const rows = HRApi.listEvaluations().map(v=>{
      const emp = employees.find(e=>e.id===v.empId);
      const name = emp? (emp.firstName+' '+emp.lastName) : v.empId;
      return `<tr>
        <td class="p-2">${name}</td>
        <td class="p-2">${v.date||''}</td>
        <td class="p-2">${v.score||''}</td>
        <td class="p-2">${v.comments||''}</td>
        <td class="p-2 text-right"><button class="text-blue-700" data-id="${v.id}">Editar</button></td>
      </tr>`;
    }).join('');
    tbody.innerHTML = rows || '<tr><td colspan="5" class="p-3 text-center text-gray-500">Sin evaluaciones</td></tr>';
    tbody.querySelectorAll('button[data-id]')?.forEach(b=> b.onclick = ()=>{
      const it = HRApi.listEvaluations().find(x=>x.id===b.getAttribute('data-id'));
      openEvalModal(it);
    });
  }

  // Documents (metadata + base64 preview)
  function openDocModal(d){
    const readOnly = (HRApi.getRole()==='Viewer');
    const m = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    box.innerHTML = `
      <div class="p-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-xl font-semibold">${d? 'Editar documento' : 'Nuevo documento'}</h3>
          <button id="closeModal" class="text-gray-500">✕</button>
        </div>
        <form id="docForm" class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="text-sm">Empleado</label>
            <select name="empId" class="border rounded-lg p-2 w-full" ${readOnly?'disabled':''}>
              ${HRApi.listEmployees().map(e=>`<option value="${e.id}" ${d?.empId===e.id?'selected':''}>${e.firstName} ${e.lastName}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="text-sm">Tipo</label>
            <input name="type" class="border rounded-lg p-2 w-full" ${readOnly?'disabled':''} value="${d?.type||''}" />
          </div>
          <div>
            <label class="text-sm">Fecha</label>
            <input type="date" name="date" class="border rounded-lg p-2 w-full" ${readOnly?'disabled':''} value="${d?.date||''}" />
          </div>
          <div class="md:col-span-2">
            <label class="text-sm block mb-1">Archivo</label>
            <input type="file" id="docFile" ${readOnly?'disabled':''} />
            ${d?.file? `<a class="text-blue-700 text-sm" target="_blank" href="${d.file}">Descargar actual</a>`: ''}
          </div>
          ${readOnly?'<div class="md:col-span-2 text-sm text-gray-500">Rol actual no permite editar</div>':''}
          <div class="md:col-span-2 flex justify-end gap-2 mt-2">
            <button type="button" id="cancelDoc" class="border rounded-lg px-3 py-2">Cancelar</button>
            ${readOnly?'':'<button type="submit" class="bg-[var(--brand)] text-white rounded-lg px-3 py-2">Guardar</button>'}
          </div>
        </form>
      </div>`;
    m.classList.remove('hidden');
    box.querySelector('#closeModal').onclick = ()=> m.classList.add('hidden');
    box.querySelector('#cancelDoc').onclick = ()=> m.classList.add('hidden');

    box.querySelector('#docFile')?.addEventListener('change',(e)=>{
      const f=e.target.files?.[0]; if(!f) return;
      const reader = new FileReader();
      reader.onload = ()=>{ box.dataset.file = reader.result; };
      reader.readAsDataURL(f);
    });

    box.querySelector('#docForm')?.addEventListener('submit', (e)=>{
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.currentTarget));
      const all = HRApi.listDocuments();
      if(d){
        const idx = all.findIndex(x=>x.id===d.id);
        all[idx] = { ...d, ...data, file: box.dataset.file || d.file };
      } else {
        all.push({ id: uid('doc'), ...data, file: box.dataset.file||'' });
      }
      HRApi.saveDocuments(all);
      toast('Documento guardado');
      document.getElementById('modalOverlay').classList.add('hidden');
      renderDocuments();
    });
  }
  function renderDocuments(){
    const tbody = document.querySelector('#docTable tbody');
    const employees = HRApi.listEmployees();
    const rows = HRApi.listDocuments().map(d=>{
      const emp = employees.find(e=>e.id===d.empId);
      const name = emp? (emp.firstName+' '+emp.lastName) : d.empId;
      return `<tr>
        <td class="p-2">${name}</td>
        <td class="p-2">${d.type||''}</td>
        <td class="p-2">${d.date||''}</td>
        <td class="p-2">${d.file? '<a class="text-blue-700" target="_blank" href="'+d.file+'">Descargar</a>' : '-'}</td>
        <td class="p-2 text-right"><button class="text-blue-700" data-id="${d.id}">Editar</button></td>
      </tr>`;
    }).join('');
    tbody.innerHTML = rows || '<tr><td colspan="5" class="p-3 text-center text-gray-500">Sin documentos</td></tr>';
    tbody.querySelectorAll('button[data-id]')?.forEach(b=> b.onclick = ()=>{
      const it = HRApi.listDocuments().find(x=>x.id===b.getAttribute('data-id'));
      openDocModal(it);
    });
  }

  // Exports (CSV & PDF minimal)
  function exportCSV(filename, rows){
    const esc = (v)=> '"'+String(v??'').replaceAll('"','""')+'"';
    const csv = rows.map(r=> r.map(esc).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  }
  async function exportPDF(filename, header, rows){
    const { jsPDF } = window.jspdf || {};
    if(!jsPDF){ toast('PDF no disponible','error'); return; }
    const doc = new jsPDF();
    let y=10; doc.setFontSize(12); doc.text(filename, 10, y); y+=6;
    doc.setFontSize(10);
    doc.text(header.join(' | '), 10, y); y+=6;
    rows.forEach(r=>{ doc.text(r.join(' | '), 10, y); y+=6; if(y>280){ doc.addPage(); y=10; }});
    doc.save(filename.replace(/\s+/g,'_')+'.pdf');
  }

  // KPIs
  function updateKPIs(){
    const emps = HRApi.listEmployees();
    const active = emps.filter(e=>e.status!=='inactivo').length;
    const vac = HRApi.listVacations();
    const absences = vac.filter(v=>v.status==='aprobado').length;
    const payroll = HRApi.listPayroll();
    const cost = payroll.reduce((s,p)=> s + (Number(p.total)||0), 0);
    document.getElementById('kpiActive').textContent = active;
    document.getElementById('kpiTurnover').textContent = (emps.length? Math.round(((emps.length-active)/emps.length)*100):0)+'%';
    document.getElementById('kpiAbsences').textContent = absences;
    document.getElementById('kpiPayrollCost').textContent = formatMoney(cost);
  }

  // Role switch
  function setupRole(){
    const sel = document.getElementById('hrRole');
    sel.value = HRApi.getRole();
    sel.onchange = ()=> HRApi.setRole(sel.value);
  }

  // Reports & exports binders
  function setupActions(){
    document.getElementById('btnNewEmployee').onclick = ()=>{
      if(HRApi.getRole()!=='RRHH') return toast('Sin permisos','error');
      openEmployeeModal();
    };
    on('employees:changed', renderEmployees);

    document.getElementById('btnCheckIn').onclick = checkIn;
    document.getElementById('btnCheckOut').onclick = checkOut;
    document.getElementById('btnAttendanceReport').onclick = async ()=>{
      const day = (document.getElementById('attDate').value|| new Date().toISOString().slice(0,10));
      const emps = HRApi.listEmployees();
      const rows = [["Fecha","Empleado","Entrada","Salida","Horas"]].concat(
        HRApi.listAttendance().filter(r=>r.date===day).map(r=>{
          const emp = emps.find(e=>e.id===r.empId);
          const name = emp? (emp.firstName+' '+emp.lastName) : r.empId;
          return [r.date, name, r.in? new Date(r.in).toLocaleTimeString('es-CL'):'', r.out? new Date(r.out).toLocaleTimeString('es-CL'):'', r.hours||0];
        })
      );
      exportCSV('asistencia_'+day+'.csv', rows);
      await exportPDF('Asistencia '+day, rows[0], rows.slice(1));
    };

    document.getElementById('btnNewVacation').onclick = ()=>{
      if(HRApi.getRole()==='Viewer') return toast('Sin permisos','error');
      openVacationModal();
    };
    on('vacations:changed', renderVacations);

    document.getElementById('btnRunPayroll').onclick = runPayroll;
    document.getElementById('btnExportPayroll').onclick = async ()=>{
      const rows = [["Empleado","Base","Horas","Bonos","Descuentos","Total"]].concat(
        HRApi.listPayroll().map(p=>[p.name, p.base, p.hours, p.bonuses, p.discounts, p.total])
      );
      exportCSV('nomina.csv', rows);
      await exportPDF('Nómina', rows[0], rows.slice(1));
    };

    document.getElementById('btnNewEval').onclick = ()=>{
      if(HRApi.getRole()==='Viewer') return toast('Sin permisos','error');
      openEvalModal();
    };
    on('evaluations:changed', renderEvaluations);

    document.getElementById('btnNewDoc').onclick = ()=>{
      if(HRApi.getRole()==='Viewer') return toast('Sin permisos','error');
      openDocModal();
    };
    on('documents:changed', renderDocuments);

    document.getElementById('btnExportEmployees').onclick = async ()=>{
      const rows = [["Nombre","RUT/DNI","Puesto","Área","Ingreso","Salario","Estado"]].concat(
        HRApi.listEmployees().map(e=>[
          (e.firstName||'')+' '+(e.lastName||''), e.nationalId||'', e.position||'', e.department||'', e.hireDate||'', e.salary||0, e.status||''
        ])
      );
      exportCSV('empleados.csv', rows);
      await exportPDF('Empleados', rows[0], rows.slice(1));
    };
    document.getElementById('btnExportAttendance').onclick = async ()=>{
      const rows = [["Fecha","Empleado","Entrada","Salida","Horas"]].concat(
        HRApi.listAttendance().map(r=>[r.date, r.empId, r.in, r.out, r.hours])
      );
      exportCSV('asistencia.csv', rows);
      await exportPDF('Asistencia', rows[0], rows.slice(1));
    };
    document.getElementById('btnExportVacations').onclick = async ()=>{
      const rows = [["Empleado","Tipo","Desde","Hasta","Días","Estado"]].concat(
        HRApi.listVacations().map(v=>[v.empId, v.type, v.from, v.to, v.days, v.status])
      );
      exportCSV('vacaciones.csv', rows);
      await exportPDF('Vacaciones', rows[0], rows.slice(1));
    };
    document.getElementById('btnExportDocs').onclick = async ()=>{
      const rows = [["Empleado","Tipo","Fecha","Archivo"]].concat(
        HRApi.listDocuments().map(d=>[d.empId, d.type, d.date, d.file? 'Sí':'No'])
      );
      exportCSV('documentos.csv', rows);
      await exportPDF('Documentos', rows[0], rows.slice(1));
    };

    document.getElementById('btnSaveSettings').onclick = ()=>{
      const s = HRApi.getSettings();
      s.vacationDays = Number(document.getElementById('cfgVacationDays').value)||15;
      s.hoursPerDay = Number(document.getElementById('cfgHoursPerDay').value)||8;
      HRApi.saveSettings(s);
      toast('Configuración guardada');
    };
  }

  function renderVacationsSummary(){ /* future: KPIs by employee */ }

  // Initializers
  function init(){
    setupNavigation();
    setupActions();
    setupRole();

    // Bind side effects
    on('employees:changed', ()=> { updateEmployeesFilters(); renderAttendance(); });

    // First paints
    updateEmployeesFilters();
    renderEmployees();
    renderAttendance();
    renderVacations();
    renderPayroll();
    renderEvaluations();
    renderDocuments();
    updateKPIs();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
