import os
import subprocess
import sys
import platform

def print_step(msg):
    print(f"\n=== {msg} ===")

def check_command(cmd, name, url):
    try:
        subprocess.run([cmd, "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print(f"❌ {name} is not installed or not in PATH.")
        print(f"Please install it from: {url}")
        return False

def main():
    print_step("1. Checking Prerequisites")
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required.")
        sys.exit(1)
    else:
        print(f"✅ Python {sys.version.split()[0]} found.")
        
    # Check Node.js and NPM
    node_installed = check_command("node", "Node.js", "https://nodejs.org/")
    npm_installed = check_command("npm", "npm", "https://nodejs.org/")
    
    if not node_installed or not npm_installed:
        print("Setup cannot continue without Node.js and npm.")
        sys.exit(1)
        
    print("✅ Node.js and npm found.")

    print_step("2. Setting up Python Virtual Environment")
    venv_dir = ".venv"
    if not os.path.exists(venv_dir):
        print("Creating virtual environment...")
        subprocess.run([sys.executable, "-m", "venv", venv_dir], check=True)
        print("✅ Virtual environment created.")
    else:
        print("✅ Virtual environment already exists.")

    print_step("3. Installing Python Dependencies")
    # Determine the pip path based on OS
    if platform.system() == "Windows":
        pip_path = os.path.join(venv_dir, "Scripts", "pip")
    else:
        pip_path = os.path.join(venv_dir, "bin", "pip")
        
    req_file = os.path.join("backend", "requirements.txt")
    if os.path.exists(req_file):
        subprocess.run([pip_path, "install", "--upgrade", "pip"], check=True)
        subprocess.run([pip_path, "install", "-r", req_file], check=True)
        print("✅ Python dependencies installed.")
    else:
        print(f"⚠️ {req_file} not found. Skipping Python dependencies.")

    print_step("4. Installing Node.js Dependencies")
    frontend_dir = "frontend"
    if os.path.exists(frontend_dir):
        # On Windows, npm needs shell=True to execute via npm.cmd
        shell_execution = platform.system() == "Windows"
        try:
            subprocess.run(["npm", "install"], cwd=frontend_dir, check=True, shell=shell_execution)
            print("✅ Node.js dependencies installed.")
        except subprocess.CalledProcessError:
            print("❌ Failed to install Node.js dependencies.")
            sys.exit(1)
    else:
        print(f"⚠️ {frontend_dir} directory not found. Skipping Node dependencies.")

    print_step("Setup Completed Successfully 🎉")
    print("You can now start the application using:")
    if platform.system() == "Windows":
        print("    run.bat")
    else:
        print("    ./run.sh")

if __name__ == "__main__":
    main()
