const express = require('express'); //test
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }));

const db = new sqlite3.Database('gestion_pro_complet.db');

// --- INITIALISATION DE LA BDD (Respect des Formes Normales) ---
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS Departement (deptEmp TEXT PRIMARY KEY, mgrEmp TEXT)");
    db.run(`CREATE TABLE IF NOT EXISTS Employees (
        idEmp TEXT PRIMARY KEY, 
        nomEmp TEXT, 
        SalEmp REAL, 
        deptEmp TEXT,
        FOREIGN KEY (deptEmp) REFERENCES Departement(deptEmp)
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS Projet (
        nomProj TEXT PRIMARY KEY, 
        Budget REAL, 
        dateDebut TEXT, 
        mgrProj TEXT,
        FOREIGN KEY (mgrProj) REFERENCES Employees(idEmp)
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS Affecter (
        idEmp TEXT,
        nomProj TEXT,
        heures INT,
        evalEmp INT,
        PRIMARY KEY (idEmp, nomProj),
        FOREIGN KEY (idEmp) REFERENCES Employees(idEmp),
        FOREIGN KEY (nomProj) REFERENCES Projet(nomProj)
    )`);

    // Données initiales issues de ton exercice
    db.run("INSERT OR IGNORE INTO Departement VALUES ('Informatique', 'E101')");
    db.run("INSERT OR IGNORE INTO Departement VALUES ('RH', 'E105')");
    db.run("INSERT OR IGNORE INTO Employees VALUES ('E101', 'Dupont', 45000, 'Informatique')");
    db.run("INSERT OR IGNORE INTO Employees VALUES ('E105', 'Adam', 43000, 'RH')");
    db.run("INSERT OR IGNORE INTO Employees VALUES ('E110', 'Rivera', 41000, 'Informatique')");
    db.run("INSERT OR IGNORE INTO Projet VALUES ('ILO', 100000, '2011-11-15', 'E101')");
    db.run("INSERT OR IGNORE INTO Affecter VALUES ('E101', 'ILO', 25, 9)");
});

// Fonction utilitaire pour récupérer les données avec des Promesses
const getQuery = (query) => new Promise((resolve, reject) => {
    db.all(query, [], (err, rows) => err ? reject(err) : resolve(rows));
});

// --- INTERFACE WEB PRO (MULTI-ONGLETS) ---
const generateHTML = ({ employes, projets, departements, affectations }) => `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>SIRH - Gestion Avancée BDD</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body { background-color: #f4f7f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .navbar { background-color: #1e293b; }
        .card { border: none; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 20px; }
        .card-header { background-color: #ffffff; font-weight: 600; color: #1e293b; border-bottom: 1px solid #e2e8f0; border-radius: 10px 10px 0 0 !important; }
        .nav-tabs .nav-link.active { font-weight: bold; color: #1e293b; border-bottom: 3px solid #0d6efd; }
        .nav-tabs .nav-link { color: #64748b; }
        .table th { background-color: #f8fafc; font-size: 0.85rem; text-transform: uppercase; color: #475569; }
    </style>
</head>
<body>
    <nav class="navbar navbar-dark mb-4 px-4 py-3">
        <span class="navbar-brand h1 mb-0"><i class="fa-solid fa-database me-2"></i> Système de Gestion de Projets & RH</span>
    </nav>

    <div class="container-fluid px-4">
        <!-- ONGLET NAVIGATION -->
        <ul class="nav nav-tabs mb-4" id="myTab" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="emp-tab" data-bs-toggle="tab" data-bs-target="#emp-pane" type="button" role="tab">👥 Employés</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="proj-tab" data-bs-toggle="tab" data-bs-target="#proj-pane" type="button" role="tab">📁 Projets</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="dept-tab" data-bs-toggle="tab" data-bs-target="#dept-pane" type="button" role="tab">🏢 Départements</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="aff-tab" data-bs-toggle="tab" data-bs-target="#aff-pane" type="button" role="tab">🔗 Affectations</button>
            </li>
        </ul>

        <div class="tab-content" id="myTabContent">
            
            <!-- 1. GESTION DES EMPLOYES -->
            <div class="tab-pane fade show active" id="emp-pane" role="tabpanel">
                <div class="row">
                    <div class="col-md-4">
                        <div class="card p-3">
                            <div class="card-header border-0">Ajouter un employé</div>
                            <form action="/ajouter/employe" method="POST">
                                <div class="mb-3"><label class="small">ID Employé</label><input type="text" name="idEmp" class="form-control" required placeholder="E112"></div>
                                <div class="mb-3"><label class="small">Nom</label><input type="text" name="nomEmp" class="form-control" required placeholder="Durand"></div>
                                <div class="mb-3"><label class="small">Salaire Annuel</label><input type="number" name="SalEmp" class="form-control" required placeholder="42000"></div>
                                <div class="mb-3"><label class="small">Département</label>
                                    <select name="deptEmp" class="form-select" required>
                                        ${departements.map(d => `<option value="${d.deptEmp}">${d.deptEmp}</option>`).join('')}
                                    </select>
                                </div>
                                <button type="submit" class="btn btn-primary w-100">Enregistrer</button>
                            </form>
                        </div>
                    </div>
                    <div class="col-md-8">
                        <div class="card p-3">
                            <div class="card-header border-0">Liste des Employés</div>
                            <table class="table table-hover align-middle">
                                <thead><tr><th>ID</th><th>Nom</th><th>Salaire</th><th>Département</th><th class="text-end">Action</th></tr></thead>
                                <tbody>
                                    ${employes.map(e => `
                                    <tr>
                                        <td><strong>${e.idEmp}</strong></td>
                                        <td>${e.nomEmp}</td>
                                        <td>${e.SalEmp} €</td>
                                        <td><span class="badge bg-secondary">${e.deptEmp}</span></td>
                                        <td class="text-end">
                                            <form action="/supprimer/employe" method="POST" style="display:inline;">
                                                <input type="hidden" name="idEmp" value="${e.idEmp}">
                                                <button class="btn btn-sm btn-outline-danger"><i class="fa-solid fa-trash"></i></button>
                                            </form>
                                        </td>
                                    </tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 2. GESTION DES PROJETS -->
            <div class="tab-pane fade" id="proj-pane" role="tabpanel">
                <div class="row">
                    <div class="col-md-4">
                        <div class="card p-3">
                            <div class="card-header border-0">Créer un projet</div>
                            <form action="/ajouter/projet" method="POST">
                                <div class="mb-3"><label class="small">Nom du Projet</label><input type="text" name="nomProj" class="form-control" required placeholder="MAXI"></div>
                                <div class="mb-3"><label class="small">Budget (€)</label><input type="number" name="Budget" class="form-control" required placeholder="200000"></div>
                                <div class="mb-3"><label class="small">Date de Début</label><input type="date" name="dateDebut" class="form-control" required></div>
                                <div class="mb-3"><label class="small">Manager du Projet (ID)</label>
                                    <select name="mgrProj" class="form-select" required>
                                        ${employes.map(e => `<option value="${e.idEmp}">${e.idEmp} - ${e.nomEmp}</option>`).join('')}
                                    </select>
                                </div>
                                <button type="submit" class="btn btn-primary w-100">Créer le Projet</button>
                            </form>
                        </div>
                    </div>
                    <div class="col-md-8">
                        <div class="card p-3">
                            <div class="card-header border-0">Liste des Projets</div>
                            <table class="table table-hover align-middle">
                                <thead><tr><th>Projet</th><th>Budget</th><th>Début</th><th>Manager (ID)</th><th class="text-end">Action</th></tr></thead>
                                <tbody>
                                    ${projets.map(p => `
                                    <tr>
                                        <td><strong>${p.nomProj}</strong></td>
                                        <td>${p.Budget} €</td>
                                        <td>${p.dateDebut}</td>
                                        <td><span class="badge bg-info text-dark">${p.mgrProj}</span></td>
                                        <td class="text-end">
                                            <form action="/supprimer/projet" method="POST" style="display:inline;">
                                                <input type="hidden" name="nomProj" value="${p.nomProj}">
                                                <button class="btn btn-sm btn-outline-danger"><i class="fa-solid fa-trash"></i></button>
                                            </form>
                                        </td>
                                    </tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 3. GESTION DES DEPARTEMENTS -->
            <div class="tab-pane fade" id="dept-pane" role="tabpanel">
                <div class="row">
                    <div class="col-md-4">
                        <div class="card p-3">
                            <div class="card-header border-0">Ajouter un Département</div>
                            <form action="/ajouter/departement" method="POST">
                                <div class="mb-3"><label class="small">Nom du Département</label><input type="text" name="deptEmp" class="form-control" required placeholder="Logistique"></div>
                                <div class="mb-3"><label class="small">Manager (ID Employé)</label>
                                    <select name="mgrEmp" class="form-select" required>
                                        ${employes.map(e => `<option value="${e.idEmp}">${e.idEmp} - ${e.nomEmp}</option>`).join('')}
                                    </select>
                                </div>
                                <button type="submit" class="btn btn-primary w-100">Ajouter</button>
                            </form>
                        </div>
                    </div>
                    <div class="col-md-8">
                        <div class="card p-3">
                            <div class="card-header border-0">Liste des Départements</div>
                            <table class="table table-hover align-middle">
                                <thead><tr><th>Département</th><th>Manager (ID)</th><th class="text-end">Action</th></tr></thead>
                                <tbody>
                                    ${departements.map(d => `
                                    <tr>
                                        <td><strong>${d.deptEmp}</strong></td>
                                        <td><span class="badge bg-success">${d.mgrEmp}</span></td>
                                        <td class="text-end">
                                            <form action="/supprimer/departement" method="POST" style="display:inline;">
                                                <input type="hidden" name="deptEmp" value="${d.deptEmp}">
                                                <button class="btn btn-sm btn-outline-danger"><i class="fa-solid fa-trash"></i></button>
                                            </form>
                                        </td>
                                    </tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 4. AFFECTATION DES EMPLOYES AUX PROJETS -->
            <div class="tab-pane fade" id="aff-pane" role="tabpanel">
                <div class="row">
                    <div class="col-md-4">
                        <div class="card p-3">
                            <div class="card-header border-0">Affecter un employé à un projet</div>
                            <form action="/ajouter/affectation" method="POST">
                                <div class="mb-3"><label class="small">Employé</label>
                                    <select name="idEmp" class="form-select" required>
                                        ${employes.map(e => `<option value="${e.idEmp}">${e.idEmp} - ${e.nomEmp}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="mb-3"><label class="small">Projet</label>
                                    <select name="nomProj" class="form-select" required>
                                        ${projets.map(p => `<option value="${p.nomProj}">${p.nomProj}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="mb-3"><label class="small">Heures / Semaine</label><input type="number" name="heures" class="form-control" required placeholder="35"></div>
                                <div class="mb-3"><label class="small">Évaluation (sur 10)</label><input type="number" name="evalEmp" class="form-control" placeholder="8"></div>
                                <button type="submit" class="btn btn-primary w-100">Lier l'employé au projet</button>
                            </form>
                        </div>
                    </div>
                    <div class="col-md-8">
                        <div class="card p-3">
                            <div class="card-header border-0">Tableau des Affectations</div>
                            <table class="table table-hover align-middle">
                                <thead><tr><th>Employé (ID)</th><th>Projet</th><th>Heures/semaine</th><th>Évaluation</th><th class="text-end">Action</th></tr></thead>
                                <tbody>
                                    ${affectations.map(a => `
                                    <tr>
                                        <td><span class="badge bg-dark">${a.idEmp}</span></td>
                                        <td><strong>${a.nomProj}</strong></td>
                                        <td>${a.heures} h</td>
                                        <td>${a.evalEmp !== null ? a.evalEmp + '/10' : 'N/A'}</td>
                                        <td class="text-end">
                                            <form action="/supprimer/affectation" method="POST" style="display:inline;">
                                                <input type="hidden" name="idEmp" value="${a.idEmp}">
                                                <input type="hidden" name="nomProj" value="${a.nomProj}">
                                                <button class="btn btn-sm btn-outline-danger"><i class="fa-solid fa-trash"></i></button>
                                            </form>
                                        </td>
                                    </tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
`;

// --- ROUTES PRINCIPALES (GET) ---
app.get('/', async (req, res) => {
    try {
        const employes = await getQuery("SELECT * FROM Employees");
        const projets = await getQuery("SELECT * FROM Projet");
        const departements = await getQuery("SELECT * FROM Departement");
        const affectations = await getQuery("SELECT * FROM Affecter");
        res.send(generateHTML({ employes, projets, departements, affectations }));
    } catch (err) {
        res.status(500).send("Erreur de récupération de la base de données : " + err.message);
    }
});

// --- ROUTES D'AJOUT (POST) ---
app.post('/ajouter/employe', (req, res) => {
    const { idEmp, nomEmp, SalEmp, deptEmp } = req.body;
    db.run("INSERT INTO Employees VALUES (?, ?, ?, ?)", [idEmp, nomEmp, SalEmp, deptEmp], () => res.redirect('/'));
});

app.post('/ajouter/projet', (req, res) => {
    const { nomProj, Budget, dateDebut, mgrProj } = req.body;
    db.run("INSERT INTO Projet VALUES (?, ?, ?, ?)", [nomProj, Budget, dateDebut, mgrProj], () => res.redirect('/'));
});

app.post('/ajouter/departement', (req, res) => {
    const { deptEmp, mgrEmp } = req.body;
    db.run("INSERT INTO Departement VALUES (?, ?)", [deptEmp, mgrEmp], () => res.redirect('/'));
});

app.post('/ajouter/affectation', (req, res) => {
    const { idEmp, nomProj, heures, evalEmp } = req.body;
    db.run("INSERT INTO Affecter VALUES (?, ?, ?, ?)", [idEmp, nomProj, heures, evalEmp || null], () => res.redirect('/'));
});

// --- ROUTES DE SUPPRESSION (POST) ---
app.post('/supprimer/employe', (req, res) => {
    db.run("DELETE FROM Employees WHERE idEmp = ?", [req.body.idEmp], () => res.redirect('/'));
});
app.post('/supprimer/projet', (req, res) => {
    db.run("DELETE FROM Projet WHERE nomProj = ?", [req.body.nomProj], () => res.redirect('/'));
});
app.post('/supprimer/departement', (req, res) => {
    db.run("DELETE FROM Departement WHERE deptEmp = ?", [req.body.deptEmp], () => res.redirect('/'));
});
app.post('/supprimer/affectation', (req, res) => {
    db.run("DELETE FROM Affecter WHERE idEmp = ? AND nomProj = ?", [req.body.idEmp, req.body.nomProj], () => res.redirect('/'));
});

// --- LANCEMENT ---
app.listen(port, () => {
    console.log(`🚀 Serveur complet en route sur http://localhost:${port}`);
});
