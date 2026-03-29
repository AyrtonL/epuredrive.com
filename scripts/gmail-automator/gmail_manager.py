import os.path
import time
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Si quieres modificar los permisos, elimina el archivo token.json
SCOPES = ['https://www.googleapis.com/auth/gmail.modify']

def autenticar():
    print("Iniciando autenticación con Google...")
    creds = None
    # El archivo token.json guarda los accesos sin volver a pedir permisos
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    
    # Si no hay credenciales o vencieron, abrimos el navegador
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists('credentials.json'):
                print("====================================")
                print("❌ ERROR: Archivo credentials.json no encontrado.")
                print("Asegurate de haber movido el archivo client_secret_*.json a esta carpeta con nombre 'credentials.json'")
                print("====================================")
                return None
            
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=8080)
            
        # Guardar las credenciales
        with open('token.json', 'w') as token:
            token.write(creds.to_json())

    try:
        service = build('gmail', 'v1', credentials=creds)
        print("✅ Conectado a Gmail Exitosamente.\n")
        return service
    except HttpError as error:
        print(f'❌ Ocurrió un error al autenticar: {error}')
        return None

def buscar_o_crear_etiqueta(service, nombre_etiqueta):
    user_id = 'me'
    try:
        results = service.users().labels().list(userId=user_id).execute()
        labels = results.get('labels', [])
        for label in labels:
            if label['name'].lower() == nombre_etiqueta.lower():
                return label['id']
        
        print(f"La etiqueta '{nombre_etiqueta}' no existe. Creando...")
        nueva_etiqueta = {
            'messageListVisibility': 'show',
            'name': nombre_etiqueta,
            'labelListVisibility': 'labelShow'
        }
        etiqueta_creada = service.users().labels().create(userId=user_id, body=nueva_etiqueta).execute()
        print(f"✅ Etiqueta '{nombre_etiqueta}' creada!")
        return etiqueta_creada['id']
    except HttpError as error:
        print(f'❌ Error al buscar/crear etiqueta: {error}')
        return None

def aplicar_etiqueta_a_base_busqueda(service, query, label_id, label_name):
    user_id = 'me'
    try:
        # 1. Buscar correos con la consulta estilo Gmail Search (ej: from:soporte)
        response = service.users().messages().list(userId=user_id, q=query).execute()
        messages = response.get('messages', [])
        
        while 'nextPageToken' in response:
            page_token = response['nextPageToken']
            response = service.users().messages().list(userId=user_id, q=query, pageToken=page_token).execute()
            messages.extend(response.get('messages', []))

        if not messages:
            print(f"Sin resultados para: '{label_name}'.")
            return

        print(f"Se encontraron {len(messages)} correos para '{label_name}'. Etiquetando...")
        
        # 2. Aplicar etiqueta en bloques de 1000 (límite de la API de batchModify)
        ids = [msg['id'] for msg in messages]
        for i in range(0, len(ids), 1000):
            bloque = ids[i:i + 1000]
            body = {
                'ids': bloque,
                'addLabelIds': [label_id],
                'removeLabelIds': []
            }
            service.users().messages().batchModify(userId=user_id, body=body).execute()
            time.sleep(1) # Pausa amigable con la API
            
        print(f"✅ Se aplicó la etiqueta '{label_name}' a {len(messages)} correos.\n")

    except HttpError as error:
        print(f"❌ Error al aplicar regla: {error}")

def main():
    print("====================================")
    print("🚗 Epure Drive - Organizador de Email")
    print("====================================\n")
    
    service = autenticar()
    if not service:
        return

    # Definimos las reglas según la lógica de Car Rental de Epure Drive
    # La etiqueta es la carpeta/etiqueta que tendra en Gmail
    # El "query" es la búsqueda (como las usarías en la barra de busqueda en Gmail web)
    reglas = [
        {
            "etiqueta": "Reservas",
            "query": "subject:reserva OR subject:booking OR subject:alquiler OR from:rentals"
        },
        {
            "etiqueta": "Facturacion",
            "query": "subject:factura OR subject:invoice OR subject:pago OR subject:receipt OR from:stripe OR from:paypal OR from:billing"
        },
        {
            "etiqueta": "Soporte",
            "query": "subject:ayuda OR subject:soporte OR subject:problema OR subject:support OR from:help"
        },
        {
            "etiqueta": "Sistema_y_Notificaciones",
            "query": "from:noreply OR from:no-reply"
        }
    ]

    for regla in reglas:
        print(f"--- Evaluando regla: {regla['etiqueta']} ---")
        etiqueta_id = buscar_o_crear_etiqueta(service, regla['etiqueta'])
        if etiqueta_id:
            aplicar_etiqueta_a_base_busqueda(service, regla['query'], etiqueta_id, regla['etiqueta'])
            
    print("====================================")
    print("🎉 ¡Terminado! Todos los correos fueron procesados y ordenados exitosamente.")
    print("====================================")

if __name__ == '__main__':
    main()
