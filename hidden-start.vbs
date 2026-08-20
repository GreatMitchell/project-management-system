' 保存为 StartDev.vbs
Dim shell
Set shell = CreateObject("WScript.Shell")
' 切换到你的项目目录（请修改为实际路径）
shell.CurrentDirectory = "D:\Projects\project-management-system"
' 运行命令，0 表示隐藏窗口
shell.Run "npm run dev -- --host 0.0.0.0", 0, False
Set shell = Nothing