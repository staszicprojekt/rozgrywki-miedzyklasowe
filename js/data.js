// js/data.js - ZAKTUALIZOWANA WERSJA DLA TWOJEJ STRUKTURY

// Konfiguracja - ID Twojego arkusza
const SHEET_ID = '1qLCQ-6uTyusQRsY23d0tvtEx2XcYmR4MLuwGVriow58';

// Publikuj arkusz jako CSV: Plik → Publikuj w internecie → wybierz CSV
const TEAMS_CSV_URL = `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?output=csv`;

class DataManager {
    constructor() {
        this.teams = [];
        this.summary = {};
    }

    // Główna funkcja do pobierania danych
    async loadAllData() {
        try {
            console.log('Ładowanie danych z Google Sheets...');
            
            // Pobierz dane z arkusza
            const csvData = await this.loadCSVData();
            
            // Przetwórz dane na drużyny
            this.teams = this.processTeamsData(csvData);
            
            // Oblicz podsumowanie
            this.summary = this.calculateSummary(this.teams);
            
            console.log('Dane załadowane pomyślnie:', this.teams);
            
            return {
                teams: this.teams,
                summary: this.summary
            };
            
        } catch (error) {
            console.error('Błąd ładowania danych:', error);
            return this.getMockData(); // Fallback na dane testowe
        }
    }

    // Pobieranie danych CSV z Google Sheets
    async loadCSVData() {
        try {
            const response = await fetch(TEAMS_CSV_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvText = await response.text();
            return this.parseCSV(csvText);
        } catch (error) {
            console.error('Błąd pobierania CSV:', error);
            throw error;
        }
    }

    // Parsowanie CSV
    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length === 0) {
            return [];
        }
        
        // Wykrywanie separatora
        const firstLine = lines[0];
        const hasComma = firstLine.includes(',');
        const hasSemicolon = firstLine.includes(';');
        const delimiter = hasComma ? ',' : (hasSemicolon ? ';' : ',');
        
        // Pobranie nagłówków
        const headers = lines[0].split(delimiter).map(h => h.trim());
        
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            
            const values = this.parseCSVLine(line, delimiter);
            
            const row = {};
            headers.forEach((header, index) => {
                if (index < values.length) {
                    row[header] = values[index].trim();
                } else {
                    row[header] = '';
                }
            });
            
            data.push(row);
        }
        
        return data;
    }

    parseCSVLine(line, delimiter) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current);
        return values.map(v => v.replace(/^"|"$/g, '').trim());
    }

    // Przetwarzanie danych na drużyny
    processTeamsData(rawData) {
        console.log('Przetwarzanie danych drużyn:', rawData);
        
        // Grupuj zawodników według drużyny (Nazwa + Klasa)
        const teamsMap = {};
        
        rawData.forEach(row => {
            const teamName = row.Nazwa || row['Nazwa drużyny'] || '';
            const className = row.Klasa || row['Klasa'] || '';
            const firstName = row.Imie || row['Imię'] || '';
            const lastName = row.Nazwisko || '';
            const isCaptain = row.Kapitan === 'TRUE' || row.Kapitan === 'true';
            
            if (!teamName || !className) {
                console.warn('Brak nazwy drużyny lub klasy:', row);
                return;
            }
            
            const teamKey = `${teamName}_${className}`;
            
            if (!teamsMap[teamKey]) {
                teamsMap[teamKey] = {
                    id: Object.keys(teamsMap).length + 1,
                    name: `${teamName} ${className}`,
                    short_name: teamName,
                    class: className,
                    players: [],
                    disciplines: [],
                    total_points: 0,
                    total_players: 0,
                    captain: null,
                    // Sprawdź czy są dane o dyscyplinach w tym samym wierszu
                    basketball: row.Koszykówka === 'TRUE',
                    volleyball: row.Siatkówka === 'TRUE',
                    football: row['Piłka Nożna'] === 'TRUE'
                };
            }
            
            // Dodaj zawodnika
            const playerName = `${firstName} ${lastName}`.trim();
            const player = {
                name: playerName,
                is_captain: isCaptain,
                number: teamsMap[teamKey].players.length + 1
            };
            
            teamsMap[teamKey].players.push(player);
            
            // Ustaw kapitana
            if (isCaptain) {
                teamsMap[teamKey].captain = playerName;
            }
            
            // Dodaj dyscypliny jeśli są w tym samym wierszu
            this.addDisciplinesFromRow(teamsMap[teamKey], row);
        });
        
        // Konwertuj mapę na tablicę
        const teams = Object.values(teamsMap);
        
        // Uzupełnij dyscypliny dla każdej drużyny
        teams.forEach(team => {
            this.setTeamDisciplines(team);
            team.total_players = team.players.length;
            team.total_points = team.disciplines.reduce((sum, d) => sum + (d.points || 0), 0);
        });
        
        console.log('Utworzone drużyny:', teams);
        return teams;
    }

    // Dodawanie dyscyplin z wiersza
    addDisciplinesFromRow(team, row) {
        const disciplines = [];
        
        if (row.Koszykówka === 'TRUE' || team.basketball) {
            disciplines.push({ name: 'Koszykówka', points: 0 });
        }
        if (row.Siatkówka === 'TRUE' || team.volleyball) {
            disciplines.push({ name: 'Siatkówka', points: 0 });
        }
        if (row['Piłka Nożna'] === 'TRUE' || team.football) {
            disciplines.push({ name: 'Piłka nożna', points: 0 });
        }
        
        // Unikalne dyscypliny
        const uniqueDisciplines = disciplines.filter((d, index, self) =>
            index === self.findIndex(t => t.name === d.name)
        );
        
        team.disciplines = uniqueDisciplines;
    }

    // Ustawianie dyscyplin dla drużyny
    setTeamDisciplines(team) {
        // Domyślne dyscypliny jeśli nie ma żadnych
        if (!team.disciplines || team.disciplines.length === 0) {
            team.disciplines = [
                { name: 'Koszykówka', points: 0 },
                { name: 'Siatkówka', points: 0 },
                { name: 'Piłka nożna', points: 0 }
            ];
        }
    }

    // Obliczanie podsumowania
    calculateSummary(teams) {
        const totalTeams = teams.length;
        const totalPlayers = teams.reduce((sum, team) => sum + team.total_players, 0);
        
        // Znajdź drużynę z największą liczbą punktów
        let championTeam = 'Brak danych';
        if (teams.length > 0) {
            const sortedTeams = [...teams].sort((a, b) => b.total_points - a.total_points);
            championTeam = sortedTeams[0].name;
        }
        
        return {
            total_teams: totalTeams,
            total_players: totalPlayers,
            champion_team: championTeam
        };
    }

    
}

// Eksportuj instancję DataManager
const dataManager = new DataManager();

// Funkcja pomocnicza do ładowania danych
async function loadTeamsData() {
    return await dataManager.loadAllData();
}

// Eksportuj dla innych plików
window.dataManager = dataManager;
window.loadTeamsData = loadTeamsData;