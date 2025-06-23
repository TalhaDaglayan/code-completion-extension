from flask import Flask, request, jsonify
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
import black

app = Flask(__name__)

MODEL_PATH = "./final_codegen_model"

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Tokenizer değişmiyor
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForCausalLM.from_pretrained(MODEL_PATH).to(device)

@app.route("/tahmin", methods=["POST"])
def kod_tamamla():
    try:
        data = request.json
        kod_girdisi = data.get("kod", "")

        print(f"Gelen İstek: {kod_girdisi}")

        if not kod_girdisi:
            return jsonify({"hata": "Boş giriş!"}), 400
        

        # 🔥 Girdiyi GPU'ya gönder
        input_ids = tokenizer(kod_girdisi, return_tensors="pt").input_ids.to(device)

        with torch.no_grad():
            output = model.generate(
                input_ids,
                max_new_tokens=50,
                eos_token_id=tokenizer.convert_tokens_to_ids("<EOL>"),  # Tamamlama burada durur
                num_beams=5,
                early_stopping=True,
                temperature=0.5,
                top_k=50,
                top_p=0.95,
                do_sample=True,
                no_repeat_ngram_size=3
            )

        raw_output = tokenizer.decode(output[0], skip_special_tokens=True)

        print(f"Modelin ham çıktısı (raw_output): {repr(raw_output)}")
        print(f"Modelin formatlanmış çıktısı: {repr(raw_output)}")

        return jsonify({"tahmin": raw_output})

    except Exception as e:
        return jsonify({"hata": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
