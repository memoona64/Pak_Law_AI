from fastapi_app.generation import generate_answer

# Fake chunk object — jaisa real retrieval se aata hai
class FakeChunk:
    def __init__(self, text, metadata):
        self.text = text
        self.metadata = metadata

# Sample chunks — ek chhota, ek bara (size variation test karne ke liye)
sample_chunks = [
    FakeChunk(
        text="Whoever commits murder shall be punished with death or imprisonment for life...",
        metadata={"act": "Pakistan Penal Code", "section": "302", "province": "Federal"}
    ),
    FakeChunk(
        text="Short excerpt about procedure.",
        metadata={"act": "Criminal Procedure Code", "section": "154", "province": "Sindh"}
    ),
]

query = "What is the punishment under Section 302?"

answer = generate_answer(query, sample_chunks)
print("=== ANSWER ===")
print(answer)