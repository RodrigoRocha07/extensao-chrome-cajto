from pymongo import MongoClient

# Substitua pela sua URL de conexão
MONGO_URL = "mongodb+srv://rodrigorochafn:chaveteste@teste.qbnzk.mongodb.net/?retryWrites=true&w=majority&appName=teste"
try:
    # Configurando o TLS manualmente
    client = MongoClient(MONGO_URL, tls=True, tlsAllowInvalidCertificates=True)
    print("Conectado com sucesso!")

    # Acessando um banco de exemplo 
    db = client["usuarios"]
    collections = db.list_collection_names()
    print("Coleções disponíveis:", collections)

except Exception as e:
    print("Erro ao conectar ao MongoDB ou listar coleções:", e)