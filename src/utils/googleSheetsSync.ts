import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { RuiQueryResult } from '../types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Provider Setup
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Load cached token from memory
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // We have a user but no in-memory token (e.g. on page refresh).
        // For security, the user must click Sign In again to grab a fresh access token with scopes.
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Error in Google Sign In:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  localStorage.removeItem('rui_spreadsheet_id');
};

/**
 * Helper to execute authorized requests to Google APIs
 */
async function googleFetch(url: string, options: RequestInit = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error('No Google Access Token available');

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google API error: ${response.status} - ${errorText}`);
  }
  return response.json();
}

/**
 * Searches for or creates a spreadsheet in Google Drive
 */
async function getOrCreateSpreadsheet(): Promise<string> {
  const cachedId = localStorage.getItem('rui_spreadsheet_id');
  if (cachedId) return cachedId;

  const fileName = 'Consulta RUI - Registro de Consultas';

  try {
    // 1. Search for existing file
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(fileName)}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
    const searchResult = await googleFetch(searchUrl);

    if (searchResult.files && searchResult.files.length > 0) {
      const spreadsheetId = searchResult.files[0].id;
      localStorage.setItem('rui_spreadsheet_id', spreadsheetId);
      return spreadsheetId;
    }

    // 2. Not found, create new spreadsheet
    const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
    const createResult = await googleFetch(createUrl, {
      method: 'POST',
      body: JSON.stringify({
        properties: {
          title: fileName
        }
      })
    });

    const spreadsheetId = createResult.spreadsheetId;
    if (!spreadsheetId) throw new Error('Failed to create new spreadsheet');

    // 3. Set the column headers
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:G1?valueInputOption=USER_ENTERED`;
    await googleFetch(updateUrl, {
      method: 'PUT',
      body: JSON.stringify({
        values: [[
          'Documento', 
          'Tipo Documento', 
          'Nombre Completo', 
          'Grupo RUI', 
          'Ubicación', 
          'Ingresos Estimados', 
          'Fecha Consulta'
        ]]
      })
    });

    localStorage.setItem('rui_spreadsheet_id', spreadsheetId);
    return spreadsheetId;
  } catch (err) {
    console.error('Error getting or creating Google Sheet:', err);
    throw err;
  }
}

/**
 * Silently synchronization of a query result to Google Sheets.
 * If the document number is already present, it is ignored without any visual warnings.
 */
export async function syncQueryToSheets(result: RuiQueryResult): Promise<void> {
  try {
    const token = await getAccessToken();
    if (!token) {
      // User is not authenticated for Sheets, skip silently
      return;
    }

    const docNum = result.numeroDocumento;
    if (!docNum) return;

    const spreadsheetId = await getOrCreateSpreadsheet();

    // 1. Fetch column A to check for duplicates
    const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:A`;
    const getResult = await googleFetch(getUrl);
    
    const existingDocs: string[] = (getResult.values || [])
      .map((row: any) => String(row[0] || '').trim());

    if (existingDocs.includes(String(docNum).trim())) {
      // Document is already registered, skip silently as requested
      console.log(`Documento ${docNum} ya registrado en Google Sheets. Ignorado de forma silenciosa.`);
      return;
    }

    // 2. Append new row
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:G:append?valueInputOption=USER_ENTERED`;
    await googleFetch(appendUrl, {
      method: 'POST',
      body: JSON.stringify({
        values: [[
          docNum,
          result.tipoDocumento || 'Cédula de Ciudadanía',
          result.nombreCompleto || result.nombre || '—',
          result.grupRui || result.nivelRui || '—',
          `${result.municipio || ''}, ${result.departamento || ''}`,
          result.grupoIngresos || '—',
          result.fechaConsulta || new Date().toISOString()
        ]]
      })
    });

    console.log(`Sincronizado con éxito documento ${docNum} en Google Sheets.`);
  } catch (err) {
    // Fail silently in the background as requested
    console.error('Sincronización silenciosa con Google Sheets falló:', err);
  }
}
