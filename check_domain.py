import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.62.138.34', username='root', password='Black2024@@@')

_, out, _ = ssh.exec_command('cat /etc/nginx/sites-enabled/* 2>/dev/null | grep -E "server_name|listen" | head -40')
print("=== NGINX DOMAINS ===")
print(out.read().decode())

_, out, _ = ssh.exec_command('ls /etc/nginx/sites-enabled/')
print("=== SITES ENABLED ===")
print(out.read().decode())

ssh.close()
