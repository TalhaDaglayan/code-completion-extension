import * as vscode from "vscode";
import axios from "axios";

const outputChannel = vscode.window.createOutputChannel("Kod Tamamlama Logları");

function getFullBlock(document: vscode.TextDocument, position: vscode.Position): string {
    let currentLine = position.line;
    let blockLines = [];

    while (currentLine >= 0) {
        const lineText = document.lineAt(currentLine).text;
        blockLines.unshift(lineText);
        if (lineText.trim().startsWith("def ") || lineText.trim().startsWith("class ")) {
            break; // Fonksiyon veya sınıfın başlangıcına ulaştık
        }
        currentLine--;
    }

    return blockLines.join("\n");
}

export function activate(context: vscode.ExtensionContext) {
    vscode.window.showInformationMessage('Kod tamamlama uzantısı aktif!');
    let disposable = vscode.languages.registerCompletionItemProvider(
        { scheme: "file", language: "python" },
        {
            async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

                // const suggestion = `def get_user(user_id):
                // user = User.query.filter_by(id=user_id).first()
                // if not user:
                //     abort(404)
                // return user`;

                // const item = new vscode.CompletionItem("Kod Önerisi", vscode.CompletionItemKind.Snippet);
                // item.insertText = new vscode.SnippetString(suggestion);
                // item.documentation = new vscode.MarkdownString("Statik öneri");

                // return [item];
                let kod = getFullBlock(document, position); // 🔹 Fonksiyon ya da sınıfın tamamını al
                if (!kod) {
                    kod = document.lineAt(position).text.substring(0, position.character); // Eğer blok yoksa tek satır al
                }

                if (!kod) {
                    return [];
                }

                try {
                    const response = await axios.post("http://127.0.0.1:5000/tahmin", { kod });
                    let suggestion = response.data.tahmin;

                    outputChannel.appendLine("Model çıktısı:");
                    outputChannel.appendLine("✅ Uzantı yüklendi!");
                    outputChannel.appendLine(suggestion);
                    outputChannel.show(true); // Otomatik açar


                    // // Escape karakterlerini gerçek karakterlere dönüştür
                    // suggestion = suggestion.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');

                    if (!suggestion) {
                        return [];
                    }

					
	
                    // ✅ Modele gönderdiğimiz girdiyi modelin döndürdüğü yanıttan çıkar
                    if (suggestion.startsWith(kod)) {
                        suggestion = suggestion.substring(kod.length);
                    }

					function normalizeSuggestion(suggestion: string): string {
						return suggestion
							.replace(/\r\n/g, '\n') // Windows satır sonlarını normalize et
							.split('\n')
							.map((line, idx) => {
							if (idx === 0) return line.trimEnd();
							return line.replace(/^[ \t]+/, '    '); // Her satırı sadece 4 boşlukla girintile
							})
							.join('\n')
							.trimEnd();
						}
					suggestion = normalizeSuggestion(suggestion);
					
                    // // ✅ Fazladan parantezleri kaldır
                    // if (kod.endsWith("(") && suggestion.startsWith(")")) {
                    //     suggestion = suggestion.substring(1);
                    // }
                    // if (kod.endsWith("(") && suggestion.includes(")")) {
                    //     suggestion = suggestion.replace(/\)/g, "");
                    // }

                    // // ✅ Özel karakterlerin etrafındaki gereksiz boşlukları kaldır
                    // suggestion = suggestion.replace(/\s*([(),=])\s*/g, "$1");
                    // suggestion = suggestion.replace(/\.\s+/g, ".");
                    // suggestion = suggestion.trim();

                    const completionItem = new vscode.CompletionItem(suggestion, vscode.CompletionItemKind.Snippet);
                    completionItem.insertText = new vscode.SnippetString(suggestion);
                    completionItem.documentation = new vscode.MarkdownString("Model tarafından önerilen kod");
                    
                    for (let i = 0; i < suggestion.length; i++) {
                        const char = suggestion[i];
                        const code = suggestion.charCodeAt(i);
                        outputChannel.appendLine(`${i}: '${char}' (code: ${code})`);
                    }

                    

                    return [completionItem];
                } catch (error) {
                    console.error("API hatası:", error);
                    return [];
                }
            }
        },
        ".", "(", "[", "{", "=", " ", "\n"  // ✅ Bunlar girildiğinde otomatik öneri açılır!
    );

    context.subscriptions.push(disposable);
    console.log("Code completion extension çalışıyor!");
}

export function deactivate() {}
