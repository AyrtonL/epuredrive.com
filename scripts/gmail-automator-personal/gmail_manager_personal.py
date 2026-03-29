import os.path
import time
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

SCOPES = ['https://www.googleapis.com/auth/gmail.modify']

def autenticar():
    print("Iniciando autenticación con Google...")
    creds = None
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists('credentials.json'):
                print("====================================")
                print("❌ ERROR: Archivo credentials.json no encontrado.")
                print("====================================")
                return None
            
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=8080)
            
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
        
        ids = [msg['id'] for msg in messages]
        for i in range(0, len(ids), 1000):
            bloque = ids[i:i + 1000]
            body = {
                'ids': bloque,
                'addLabelIds': [label_id],
                'removeLabelIds': []
            }
            service.users().messages().batchModify(userId=user_id, body=body).execute()
            time.sleep(1)
            
        print(f"✅ Se aplicó la etiqueta '{label_name}' a {len(messages)} correos.\n")

    except HttpError as error:
        print(f"❌ Error al aplicar regla: {error}")

def main():
    print("====================================")
    print("👤 Organizador de Email Personal")
    print("====================================\n")
    
    service = autenticar()
    if not service:
        return

    reglas = [
        {
            "etiqueta": "Finanzas_y_Bancos",
            "query": "subject:recibo OR subject:pago OR subject:transferencia OR subject:suscripcion OR subject:bank OR subject:banco OR subject:factura OR from:paypal OR from:stripe"
        },
        {
            "etiqueta": "Compras",
            "query": "subject:compra OR subject:pedido OR subject:envío OR subject:amazon OR subject:mercadolibre OR subject:order"
        },
        {
            "etiqueta": "Viajes",
            "query": "subject:vuelo OR subject:reserva OR subject:hotel OR subject:airbnb OR subject:uber OR subject:viaje OR subject:flight"
        },
        {
            "etiqueta": "Newsletters_y_Social",
            "query": "subject:boletín OR subject:newsletter OR from:linkedin OR from:facebook OR from:instagram OR from:twitter"
        },
        {
            "etiqueta": "Estudios_y_Trabajo",
            "query": "subject:curso OR subject:clase OR subject:reunión OR subject:zoom OR subject:meet"
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
