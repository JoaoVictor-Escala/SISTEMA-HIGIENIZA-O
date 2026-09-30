import os
import json

def setup():
    print("=== Configurando Padrao de Agente para o Projeto ===")
    
    nome = input("Qual o nome deste sistema? ")
    ip = input("Qual o IP da VPS onde ele fica? (Deixe em branco se nao houver): ")
    pasta_vps = input("Qual a pasta do projeto lá na VPS? (ex: /root/meu-sistema): ")
    
    # 1. Cria diretórios
    os.makedirs(".agents/skills/deploy_vps", exist_ok=True)
    
    # 2. Cria AGENTS.md
    with open(".agents/AGENTS.md", "w", encoding="utf-8") as f:
        f.write(f"# Contexto do Projeto: {nome}\n\n")
        if ip:
            f.write(f"- **Servidor de Produção (VPS):** IP {ip}\n")
            f.write(f"- **Localização na VPS:** {pasta_vps}\n\n")
        f.write("## Regras do Projeto\n")
        f.write("- Sempre respeite o escopo e edite apenas os arquivos deste workspace.\n")
        f.write("- Quando solicitado deploy, utilize o script local 'deploy_vps.py' atraves do comando 'npm run deploy'.\n")
        
    print("-> [OK] Regras do projeto criadas (.agents/AGENTS.md)")

    # 3. Cria Template de Deploy
    if ip:
        deploy_script = f"""import paramiko
import os
import zipfile
import sys

# Corrige problema de codificacao no Windows
sys.stdout.reconfigure(encoding='utf-8')

print("Iniciando compactacao...")
# ATENCAO: Mude 'frontend/src' para a pasta correta que precisa subir
PASTA_ALVO = 'frontend/src'
ARQUIVO_ZIP = 'update.zip'
CAMINHO_VPS = '{pasta_vps}'

with zipfile.ZipFile(ARQUIVO_ZIP, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(PASTA_ALVO): 
        for file in files:
            file_path = os.path.join(root, file)
            zipf.write(file_path, arcname=file_path.replace('\\\\', '/'))

print("Conectando na VPS...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key_path = os.path.expanduser('~/.ssh/id_ed25519_higigestor')
ssh.connect('{ip}', username='root', key_filename=key_path)

print("Enviando arquivos...")
sftp = ssh.open_sftp()
sftp.put(ARQUIVO_ZIP, f"{{CAMINHO_VPS}}/{{ARQUIVO_ZIP}}")
sftp.close()

print("Descompactando e reiniciando Docker...")
# ATENCAO: Verifique se o nome do container no docker compose up esta correto
cmd = f'''
cd {{CAMINHO_VPS}}
unzip -o {{ARQUIVO_ZIP}}
docker compose up -d --build
rm {{ARQUIVO_ZIP}}
'''
stdin, stdout, stderr = ssh.exec_command(cmd)

for line in stdout.read().decode('utf-8', 'ignore').splitlines():
    print(line)
for line in stderr.read().decode('utf-8', 'ignore').splitlines():
    print(line)

ssh.close()
print("Deploy Finalizado com Sucesso!")
"""
        with open("deploy_vps.py", "w", encoding="utf-8") as f:
            f.write(deploy_script)
        print("-> [OK] Script de Deploy criado (deploy_vps.py) - LEMBRE DE EDITAR A PASTA ALVO NELE!")

        # 4. Modifica package.json
        if os.path.exists("package.json"):
            try:
                with open("package.json", "r", encoding="utf-8") as f:
                    pkg = json.load(f)
                
                if "scripts" not in pkg:
                    pkg["scripts"] = {}
                pkg["scripts"]["deploy"] = "py deploy_vps.py"
                
                with open("package.json", "w", encoding="utf-8") as f:
                    json.dump(pkg, f, indent=2)
                print("-> [OK] package.json atualizado! (Comando 'npm run deploy' disponivel)")
            except Exception as e:
                print(f"-> [AVISO] Nao foi possivel modificar package.json: {e}")
        else:
            print("-> [AVISO] Arquivo package.json nao encontrado na raiz. Rode 'npm init -y' se precisar.")

    print("\n=== TUDO PRONTO! ===")
    print("Agora e so me abrir no VSCode desta pasta que eu vou saber de tudo.")

if __name__ == "__main__":
    setup()
