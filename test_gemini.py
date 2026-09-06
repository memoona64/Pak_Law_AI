import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()  # reads your .env file

api_key = os.getenv("GEMINI_API_KEY")
print("Key loaded:", "Yes" if api_key else "No — check your .env file")

genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-3.6-flash")

response = model.generate_content("Say hello in one short sentence.")
print("Gemini says:", response.text)