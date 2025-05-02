from gradio_client import Client

def get_huggingface_response(message, system_message):
    client = Client("https://acikburak-ai2.hf.space/")  # Your Hugging Face space URL
    result = client.predict(
        message=message,
        system_message=system_message,  # Pass dynamic system message (model file)
        max_tokens=512,
        temperature=0.7,
        top_p=0.95,
        api_name="/chat"
    )
    return result

