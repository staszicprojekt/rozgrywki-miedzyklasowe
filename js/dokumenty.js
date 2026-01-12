// dokumenty.js
// Dynamiczne ładowanie dokumentów z Google Sheets - uproszczona wersja

// Konfiguracja Google Sheets
const SPREADSHEET_ID = '1qLCQ-6uTyusQRsY23d0tvtEx2XcYmR4MLuwGVriow58';
const DOCUMENTS_SHEET_NAME = 'Dokumenty';
const DOCUMENTS_RANGE = 'A2:F20'; // Od wiersza 2 (bez nagłówków) do 20

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Inicjalizacja strony dokumentów...');
    
    // Ustawienie aktualnej daty
    updateCurrentDate();
    
    // Załaduj dokumenty
    loadDocumentsFromGoogleSheets();
});

// Funkcja do ustawiania aktualnej daty
function updateCurrentDate() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    
    const dateString = now.toLocaleDateString('pl-PL', options);
    const dateElement = document.getElementById('currentDate');
    
    if (dateElement) {
        dateElement.textContent = dateString;
    }
}

// Główna funkcja ładowania dokumentów
async function loadDocumentsFromGoogleSheets() {
    console.log('📥 Ładowanie dokumentów z Google Sheets...');
    
    try {
        const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${DOCUMENTS_SHEET_NAME}&range=${DOCUMENTS_RANGE}`;
        
        const response = await fetch(url);
        const text = await response.text();
        
        // Parsowanie odpowiedzi Google Sheets
        const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\((.*)\);/);
        
        if (!jsonMatch) {
            throw new Error('Nieprawidłowa odpowiedź z Google Sheets');
        }
        
        const data = JSON.parse(jsonMatch[1]);
        console.log('✅ Dane dokumentów załadowane:', data.table.rows.length, 'dokumentów');
        
        displayDocuments(data.table.rows);
        
    } catch (error) {
        console.error('❌ Błąd ładowania dokumentów:', error);
        showFallbackDocuments();
    }
}

// Funkcja wyświetlająca dokumenty
function displayDocuments(rows) {
    const documentsGrid = document.getElementById('documentsGrid');
    const noDocuments = document.getElementById('noDocuments');
    
    // Sprawdź czy są dane
    if (!rows || rows.length === 0) {
        documentsGrid.innerHTML = '';
        noDocuments.style.display = 'block';
        return;
    }
    
    // Posortuj dokumenty według daty (najnowsze na górze)
    const sortedRows = [...rows].sort((a, b) => {
        const dateA = a.c[5]?.v ? new Date(a.c[5].v) : new Date(0);
        const dateB = b.c[5]?.v ? new Date(b.c[5].v) : new Date(0);
        return dateB - dateA;
    });
    
    // Utwórz HTML dla dokumentów
    let html = '';
    let validDocumentsCount = 0;
    
    sortedRows.forEach((row, index) => {
        const cells = row.c;
        
        // Pobierz dane z komórek
        const id = cells[0]?.v || index + 1;
        const name = cells[1]?.v || 'Brak nazwy';
        const description = cells[2]?.v || 'Brak opisu';
        const fileUrl = cells[3]?.v || '#';
        const fileType = cells[4]?.v || 'PDF';
        const rawDate = cells[5]?.v;
        
        // Formatuj datę
        let formattedDate = 'Brak daty';
        if (rawDate) {
            try {
                const date = new Date(rawDate);
                formattedDate = date.toLocaleDateString('pl-PL', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });
            } catch (e) {
                formattedDate = rawDate;
            }
        }
        
        // Jeśli nie ma nazwy, pomiń dokument
        if (name === 'Brak nazwy') return;
        
        validDocumentsCount++;
        
        // Określ typ przycisku na podstawie typu pliku
        const isForm = fileType.toUpperCase() === 'FORM';
        const buttonText = isForm ? 'Otwórz formularz' : 'Pobierz dokument';
        const buttonIcon = isForm ? 'fas fa-external-link-alt' : 'fas fa-download';
        const buttonClass = isForm ? 'btn-open-form' : 'btn-download';
        
        // Określ ikonę dokumentu
        const documentIcon = getDocumentIcon(fileType);
        const documentColor = getDocumentColor(fileType);
        
        html += `
            <div class="document-card">
                <div class="document-icon" style="background: ${documentColor};">
                    <i class="${documentIcon}"></i>
                </div>
                <div class="document-content">
                    <h3 class="document-title">${name}</h3>
                    <p class="document-description">${documentDescription(description)}</p>
                    <div class="document-meta">
                        <span class="document-date">
                            <i class="far fa-calendar"></i> ${formattedDate}
                        </span>
                    </div>
                </div>
                <div class="document-actions">
                    <a href="${fileUrl}" class="${buttonClass}" 
                       ${isForm ? 'target="_blank" rel="noopener noreferrer"' : 'download'}
                       title="${isForm ? 'Otwórz formularz' : 'Pobierz dokument'}">
                        <i class="${buttonIcon}"></i> ${buttonText}
                    </a>
                </div>
            </div>
        `;
    });
    
    // Jeśli nie ma żadnych dokumentów
    if (validDocumentsCount === 0) {
        documentsGrid.innerHTML = '';
        noDocuments.style.display = 'block';
        return;
    }
    
    // Wyświetl dokumenty
    documentsGrid.innerHTML = html;
    noDocuments.style.display = 'none';
    
    console.log(`✅ Wyświetlono ${validDocumentsCount} dokumentów`);
}

// Pomocnicza funkcja do opisu dokumentu
function documentDescription(desc) {
    if (!desc || desc === 'Brak opisu') {
        return 'Kliknij przycisk poniżej, aby pobrać lub otworzyć dokument.';
    }
    return desc;
}

// Funkcja dla domyślnych dokumentów (fallback)
function showFallbackDocuments() {
    const documentsGrid = document.getElementById('documentsGrid');
    const noDocuments = document.getElementById('noDocuments');
    
    const fallbackDocuments = [
        {
            name: "Regulamin rozgrywek",
            description: "Pełny regulamin rozgrywek międzyklasowych",
            fileUrl: "#",
            fileType: "PDF",
            date: new Date().toLocaleDateString('pl-PL'),
            isForm: false
        },
        {
            name: "Formularz zgłoszeniowy",
            description: "Zgłoś swoją drużynę do rozgrywek",
            fileUrl: "#",
            fileType: "FORM",
            date: new Date().toLocaleDateString('pl-PL'),
            isForm: true
        }
    ];
    
    let html = '';
    fallbackDocuments.forEach(doc => {
        const buttonText = doc.isForm ? 'Otwórz formularz' : 'Pobierz dokument';
        const buttonIcon = doc.isForm ? 'fas fa-external-link-alt' : 'fas fa-download';
        const buttonClass = doc.isForm ? 'btn-open-form' : 'btn-download';
        const documentIcon = getDocumentIcon(doc.fileType);
        const documentColor = getDocumentColor(doc.fileType);
        
        html += `
            <div class="document-card">
                <div class="document-icon" style="background: ${documentColor};">
                    <i class="${documentIcon}"></i>
                </div>
                <div class="document-content">
                    <h3 class="document-title">${doc.name}</h3>
                    <p class="document-description">${doc.description}</p>
                    <div class="document-meta">
                        <span class="document-date">
                            <i class="far fa-calendar"></i> ${doc.date}
                        </span>
                    </div>
                </div>
                <div class="document-actions">
                    <a href="${doc.fileUrl}" class="${buttonClass}" 
                       onclick="alert('Brak połączenia z bazą dokumentów')"
                       title="${buttonText}">
                        <i class="${buttonIcon}"></i> ${buttonText}
                    </a>
                </div>
            </div>
        `;
    });
    
    documentsGrid.innerHTML = html;
    noDocuments.style.display = 'none';
}

// Funkcja zwracająca ikonę dla typu dokumentu
function getDocumentIcon(fileType) {
    const type = fileType.toUpperCase();
    
    const iconMap = {
        'PDF': 'fas fa-file-pdf',
        'FORM': 'fas fa-file-signature',
        'DOC': 'fas fa-file-word',
        'DOCX': 'fas fa-file-word',
        'XLS': 'fas fa-file-excel',
        'XLSX': 'fas fa-file-excel',
        'PPT': 'fas fa-file-powerpoint',
        'PPTX': 'fas fa-file-powerpoint',
        'JPG': 'fas fa-file-image',
        'PNG': 'fas fa-file-image',
        'ZIP': 'fas fa-file-archive',
        'default': 'fas fa-file'
    };
    
    return iconMap[type] || iconMap.default;
}

// Funkcja zwracająca kolor dla typu dokumentu
function getDocumentColor(fileType) {
    const type = fileType.toUpperCase();
    
    const colorMap = {
        'PDF': '#FF5252',
        'FORM': '#4CAF50', // Zielony dla formularzy
        'DOC': '#2A5CAA',
        'DOCX': '#2A5CAA',
        'XLS': '#1D6F42',
        'XLSX': '#1D6F42',
        'PPT': '#D24726',
        'PPTX': '#D24726',
        'default': '#4361ee'
    };
    
    return colorMap[type] || colorMap.default;
}

// Funkcja odświeżania dokumentów
function refreshDocuments() {
    console.log('🔄 Odświeżanie dokumentów...');
    loadDocumentsFromGoogleSheets();
    
    // Animacja odświeżania
    const grid = document.getElementById('documentsGrid');
    grid.style.opacity = '0.5';
    grid.style.transition = 'opacity 0.3s';
    
    setTimeout(() => {
        grid.style.opacity = '1';
    }, 300);
}

// Automatyczne odświeżanie co 5 minut
setInterval(() => {
    if (document.visibilityState === 'visible') {
        console.log('⏰ Automatyczne odświeżanie dokumentów...');
        loadDocumentsFromGoogleSheets();
    }
}, 300000); // 5 minut