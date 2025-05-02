from gradio_client import Client

client = Client("https://acikburak-ai2.hf.space/")

result = client.predict(
    message="ali burak açık parolasını sıfırla, cümlesini açıkla",                      
    system_message = 
    "Sen Kali Linux üzerinde çalışan elit bir siber güvenlik uzmanısın.     Penetrasyon testi, zafiyet analizi ve hacking araçları konusunda uzmansın. Yanıtların teknik ve profesyonel olsun.",
    max_tokens=512,
    temperature=0.7,
    top_p=0.95,
    api_name="/chat"
)

print("Bot cevabı:", result)
