# Global log storage for Admin Panel
system_logs = []

def add_log(entry):
    global system_logs
    system_logs.append(entry)
    if len(system_logs) > 100:
        system_logs.pop(0)

def get_logs():
    return system_logs
