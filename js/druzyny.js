// js/druzyny.js - ZAKTUALIZOWANA WERSJA

let allTeams = [];
let currentView = 'grid';
let currentPage = 1;
const teamsPerPage = 12;

// Inicjalizacja
document.addEventListener('DOMContentLoaded', function() {
    console.log('Strona drużyn załadowana');
    initPage();
    loadTeams();
});

async function initPage() {
    // Ustaw datę
    const now = new Date();
    document.getElementById('currentDate').textContent = 
        now.toLocaleDateString('pl-PL', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    
    // Event listeners dla przycisków widoku
    document.getElementById('gridViewBtn').addEventListener('click', () => setViewMode('grid'));
    document.getElementById('listViewBtn').addEventListener('click', () => setViewMode('list'));
    
    // Event listeners dla modala
    const modal = document.getElementById('teamModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeModal();
    });
}

async function loadTeams() {
    showLoading();
    
    try {
        console.log('Rozpoczynam ładowanie drużyn...');
        const data = await loadTeamsData();
        
        allTeams = data.teams || [];
        const summary = data.summary || {};
        
        console.log('Załadowane drużyny:', allTeams.length);
        console.log('Podsumowanie:', summary);
        
        updateSummary(summary);
        renderTeams();
        
    } catch (error) {
        console.error('Błąd ładowania drużyn:', error);
        showError('Nie udało się załadować danych drużyn: ' + error.message);
        // Fallback na dane testowe
        allTeams = getMockTeams();
        updateSummary(getMockSummary());
        renderTeams();
    } finally {
        hideLoading();
    }
}

function updateSummary(summary) {
    const totalTeamsEl = document.getElementById('totalTeams');
    const totalPlayersEl = document.getElementById('totalPlayers');
    const championTeamEl = document.getElementById('championTeam');
    
    if (totalTeamsEl) totalTeamsEl.textContent = summary.total_teams || 0;
    if (totalPlayersEl) totalPlayersEl.textContent = summary.total_players || 0;
    if (championTeamEl) championTeamEl.textContent = summary.champion_team || '-';
}

function renderTeams() {
    console.log('Renderowanie drużyn, liczba:', allTeams.length);
    
    // Ukryj początkowy loader
    const initialLoading = document.getElementById('initialLoading');
    if (initialLoading) {
        initialLoading.style.display = 'none';
    }
    
    if (allTeams.length === 0) {
        showNoTeams();
        return;
    }
    
    hideNoTeams();
    
    const start = (currentPage - 1) * teamsPerPage;
    const end = start + teamsPerPage;
    const teamsToShow = allTeams.slice(start, end);
    
    console.log('Pokazuję drużyny od', start, 'do', end, ':', teamsToShow.length);
    
    if (currentView === 'grid') {
        renderGrid(teamsToShow);
    } else {
        renderList(teamsToShow);
    }
    
    updatePagination();
}

function renderGrid(teams) {
    const container = document.getElementById('teamsGridContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (teams.length === 0) {
        container.innerHTML = '<p class="empty-state">Brak drużyn do wyświetlenia</p>';
        return;
    }
    
    teams.forEach(team => {
        const teamCard = createTeamCard(team);
        container.appendChild(teamCard);
    });
}

function createTeamCard(team) {
    const card = document.createElement('div');
    card.className = 'team-card';
    card.setAttribute('data-team-id', team.id);
    
    // Utwórz inicjały dla logo
    const initials = team.short_name 
        ? team.short_name.substring(0, 2).toUpperCase()
        : team.name.substring(0, 2).toUpperCase();
    
    // Oblicz sumę punktów
    const totalPoints = team.total_points || 
        (team.disciplines ? team.disciplines.reduce((sum, d) => sum + (d.points || 0), 0) : 0);
    
    card.innerHTML = `
        <div class="team-card-header">
            <div class="team-logo-placeholder">${initials}</div>
            <div class="team-name-container">
                <h3>${team.short_name || team.name}</h3>
                <div style="display: flex; align-items: center; gap: 10px; margin-top: 5px;">
                    <span class="team-class-badge">${team.class}</span>
                    <span style="font-size: 0.9em; color: #666;">${team.total_players || 0} zawodników</span>
                </div>
            </div>
        </div>
        
        <div class="team-sports-container">
            ${team.disciplines && team.disciplines.length > 0 ? 
                team.disciplines.map(d => `
                    <span class="sport-badge sport-${d.name.toLowerCase().replace(/\s+/g, '-')}">
                        <i class="${getSportIcon(d.name)}"></i>
                        ${d.name}
                    </span>
                `).join('') :
                '<span class="sport-badge sport-default">Brak dyscyplin</span>'
            }
        </div>
        
        <div class="team-info-grid">
            <div class="info-item">
                <i class="fas fa-crown"></i>
                <span>${team.captain || 'Brak kapitana'}</span>
            </div>
            <div class="info-item">
                <i class="fas fa-trophy"></i>
                <span><strong>${totalPoints}</strong> pkt</span>
            </div>
        </div>
        
        <div class="team-card-footer">
            <div class="team-status status-active">
                <i class="fas fa-circle"></i>
                <span>Aktywna</span>
            </div>
            <button class="btn-view-details" onclick="viewTeamDetails(${team.id})">
                Szczegóły <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
    
    // Kliknięcie na całą kartę
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-view-details')) {
            viewTeamDetails(team.id);
        }
    });
    
    return card;
}

function renderList(teams) {
    const container = document.getElementById('teamsListTable');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (teams.length === 0) {
        container.innerHTML = '<tr><td colspan="7" class="empty-state">Brak drużyn do wyświetlenia</td></tr>';
        return;
    }
    
    teams.forEach(team => {
        const row = createTeamRow(team);
        container.appendChild(row);
    });
}

function createTeamRow(team) {
    const row = document.createElement('tr');
    const totalPoints = team.total_points || 
        (team.disciplines ? team.disciplines.reduce((sum, d) => sum + (d.points || 0), 0) : 0);
    
    // Utwórz inicjały dla logo
    const initials = team.short_name 
        ? team.short_name.substring(0, 2).toUpperCase()
        : team.name.substring(0, 2).toUpperCase();
    
    row.innerHTML = `
        <td>
            <div style="display: flex; align-items: center; gap: 10px;">
                <div class="team-logo-placeholder" style="width: 40px; height: 40px; font-size: 14px;">
                    ${initials}
                </div>
                <div>
                    <strong>${team.name}</strong><br>
                    <small style="color: #666;">${team.class}</small>
                </div>
            </div>
        </td>
        <td>${team.class}</td>
        <td>
            <div style="display: flex; gap: 5px;">
                ${team.disciplines && team.disciplines.slice(0, 3).map(d => `
                    <div class="sport-badge-small" style="background: ${getSportColor(d.name)}; 
                         width: 30px; height: 30px; border-radius: 50%; display: flex; 
                         align-items: center; justify-content: center;" 
                         title="${d.name}">
                        <i class="${getSportIcon(d.name)}" style="color: white; font-size: 12px;"></i>
                    </div>
                `).join('')}
                ${team.disciplines && team.disciplines.length > 3 ? 
                    `<div style="font-size: 11px; color: #666;">+${team.disciplines.length - 3}</div>` : ''
                }
            </div>
        </td>
        <td>${team.captain || '-'}</td>
        <td>${team.total_players || team.players?.length || 0}</td>
        <td><strong>${totalPoints}</strong></td>
        <td>
            <button class="btn-action" onclick="viewTeamDetails(${team.id})" title="Szczegóły">
                <i class="fas fa-eye"></i>
            </button>
        </td>
    `;
    
    return row;
}

function viewTeamDetails(teamId) {
    console.log('Otwieranie szczegółów drużyny:', teamId);
    
    const team = allTeams.find(t => t.id == teamId);
    if (!team) {
        console.error('Nie znaleziono drużyny o ID:', teamId);
        return;
    }
    
    // Pokaż modal
    document.getElementById('teamModal').style.display = 'flex';
    
    // Wypełnij modal danymi
    document.getElementById('modalTeamName').textContent = team.name;
    
    const modalBody = document.getElementById('teamDetailsContent');
    const totalPoints = team.total_points || 
        (team.disciplines ? team.disciplines.reduce((sum, d) => sum + (d.points || 0), 0) : 0);
    
    modalBody.innerHTML = `
        <div class="team-modal-header">
            <div class="team-modal-title">
                <h3 style="margin: 0; color: #1a237e;">${team.name}</h3>
                <span class="team-class-large">${team.class}</span>
            </div>
            
            <div class="team-stats">
                <div class="stat-box">
                    <div class="stat-value">${team.total_players || team.players?.length || 0}</div>
                    <div class="stat-label">Zawodników</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${team.disciplines ? team.disciplines.length : 0}</div>
                    <div class="stat-label">Dyscypliny</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${totalPoints}</div>
                    <div class="stat-label">Łącznie punktów</div>
                </div>
            </div>
        </div>
        
        <div class="team-details-grid">
            <div class="team-section">
                <h4 class="section-title"><i class="fas fa-users"></i> Zawodnicy (${team.total_players || team.players?.length || 0})</h4>
                <div class="players-list">
                    ${team.players && team.players.length > 0 ? 
                        team.players.map(player => `
                            <div class="player-item ${player.is_captain ? 'player-captain' : ''}">
                                <div class="player-name">
                                    ${player.name}
                                    ${player.is_captain ? '<i class="fas fa-crown captain-badge" title="Kapitan"></i>' : ''}
                                </div>
                                ${player.number ? `<div class="player-number">#${player.number}</div>` : ''}
                            </div>
                        `).join('') :
                        '<p style="color: #666; text-align: center; padding: 20px;">Brak danych o zawodnikach</p>'
                    }
                </div>
            </div>
            
            <div class="team-section">
                <h4 class="section-title"><i class="fas fa-trophy"></i> Dyscypliny i punkty</h4>
                <div class="disciplines-list">
                    ${team.disciplines && team.disciplines.length > 0 ?
                        team.disciplines.map(discipline => `
                            <div class="discipline-item" style="background: ${getSportColor(discipline.name)};">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <i class="${getSportIcon(discipline.name)}" style="font-size: 20px;"></i>
                                    <span style="flex: 1; font-weight: bold;">${discipline.name}</span>
                                </div>
                                <strong style="font-size: 1.2em;">${discipline.points || 0} pkt</strong>
                            </div>
                        `).join('') :
                        '<p style="color: #666; text-align: center; padding: 20px;">Brak danych o dyscyplinach</p>'
                    }
                </div>
                
                ${team.disciplines && team.disciplines.length > 0 ? `
                    <div style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
                        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.1em;">
                            <span>SUMA PUNKTÓW:</span>
                            <span>${totalPoints} punktów</span>
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Funkcje pomocnicze
function getSportColor(sportName) {
    if (!sportName) return '#607d8b';
    
    const sport = sportName.toLowerCase();
    if (sport.includes('piłka') || sport.includes('nożna') || sport.includes('futbol')) return '#2196f3'; // niebieski
    if (sport.includes('siatków') || sport.includes('volleyball')) return '#4caf50'; // zielony
    if (sport.includes('koszyk') || sport.includes('basketball')) return '#ff5252'; // czerwony
    if (sport.includes('szach') || sport.includes('chess')) return '#795548'; // brązowy
    if (sport.includes('lekkoatletyk') || sport.includes('running')) return '#ff9800'; // pomarańczowy
    return '#607d8b'; // szary
}

function getSportIcon(sportName) {
    if (!sportName) return 'fas fa-dumbbell';
    
    const sport = sportName.toLowerCase();
    if (sport.includes('piłka') || sport.includes('nożna') || sport.includes('futbol')) return 'fas fa-futbol';
    if (sport.includes('siatków') || sport.includes('volleyball')) return 'fas fa-volleyball-ball';
    if (sport.includes('koszyk') || sport.includes('basketball')) return 'fas fa-basketball-ball';
    if (sport.includes('szach') || sport.includes('chess')) return 'fas fa-chess';
    if (sport.includes('lekkoatletyk') || sport.includes('running')) return 'fas fa-running';
    return 'fas fa-dumbbell';
}

function setViewMode(mode) {
    currentView = mode;
    currentPage = 1;
    
    // Aktualizuj przyciski
    document.getElementById('gridViewBtn').classList.toggle('active', mode === 'grid');
    document.getElementById('listViewBtn').classList.toggle('active', mode === 'list');
    
    // Pokaż/ukryj odpowiednie kontenery
    document.getElementById('teamsGridContainer').style.display = mode === 'grid' ? 'grid' : 'none';
    document.getElementById('teamsListContainer').style.display = mode === 'list' ? 'block' : 'none';
    
    renderTeams();
}

function changePage(delta) {
    const totalPages = Math.ceil(allTeams.length / teamsPerPage);
    const newPage = currentPage + delta;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderTeams();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function updatePagination() {
    const totalPages = Math.ceil(allTeams.length / teamsPerPage);
    const pagination = document.getElementById('pagination');
    const pageInfo = document.getElementById('pageInfo');
    
    if (totalPages > 1) {
        pagination.style.display = 'flex';
        pageInfo.textContent = `Strona ${currentPage} z ${totalPages}`;
        
        // Aktualizuj przyciski
        document.getElementById('prevPageBtn').disabled = currentPage === 1;
        document.getElementById('nextPageBtn').disabled = currentPage === totalPages;
    } else {
        pagination.style.display = 'none';
    }
}

function closeModal() {
    document.getElementById('teamModal').style.display = 'none';
}

function showLoading() {
    const loadingElement = document.getElementById('loadingTeams');
    if (loadingElement) {
        loadingElement.style.display = 'block';
    }
}

function hideLoading() {
    const loadingElement = document.getElementById('loadingTeams');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

function showError(message) {
    const container = document.getElementById('teamsGridContainer');
    if (container) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #f44336;"></i>
                <p style="margin: 20px 0; color: #f44336; font-size: 1.1em;">${message}</p>
                <button onclick="loadTeams()" class="btn-sport">
                    <i class="fas fa-redo"></i> Spróbuj ponownie
                </button>
            </div>
        `;
    }
}

function showNoTeams() {
    const noTeamsMessage = document.getElementById('noTeamsMessage');
    if (noTeamsMessage) {
        noTeamsMessage.style.display = 'block';
    }
    
    const container = document.getElementById('teamsGridContainer');
    if (container) {
        container.innerHTML = '';
    }
    
    const listContainer = document.getElementById('teamsListContainer');
    if (listContainer) {
        listContainer.style.display = 'none';
    }
    
    const pagination = document.getElementById('pagination');
    if (pagination) {
        pagination.style.display = 'none';
    }
}

function hideNoTeams() {
    const noTeamsMessage = document.getElementById('noTeamsMessage');
    if (noTeamsMessage) {
        noTeamsMessage.style.display = 'none';
    }
}

// Dane testowe
function getMockTeams() {
    return [
        {
            id: 1,
            name: "ZPW 3B",
            short_name: "ZPW",
            class: "3B",
            players: [
                { name: "Aleksander Dąbek", is_captain: true, number: 1 },
                { name: "Jan Zawadzki", is_captain: false, number: 2 },
                { name: "Tomasz Mazur", is_captain: false, number: 3 }
            ],
            disciplines: [
                { name: "Koszykówka", points: 15 },
                { name: "Siatkówka", points: 12 },
                { name: "Piłka nożna", points: 18 }
            ],
            total_points: 45,
            total_players: 7,
            captain: "Aleksander Dąbek"
        }
    ];
}

function getMockSummary() {
    return {
        total_teams: 1,
        total_players: 7,
        champion_team: "ZPW 3B"
    };
}

// Eksport funkcji do globalnego scope
window.viewTeamDetails = viewTeamDetails;
window.closeModal = closeModal;
window.setViewMode = setViewMode;
window.changePage = changePage;
window.loadTeams = loadTeams;