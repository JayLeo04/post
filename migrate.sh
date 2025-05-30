#!/bin/bash

# 数据迁移脚本
# 用于在不同服务器之间迁移博客数据

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置变量
SOURCE_URL=""
TARGET_URL=""
ADMIN_TOKEN=""
BACKUP_DIR="./backups"
TEMP_DIR="./temp"

# 显示帮助信息
show_help() {
    echo "博客数据迁移脚本"
    echo ""
    echo "用法:"
    echo "  $0 export <source_url> <admin_token>     - 从源服务器导出数据"
    echo "  $0 import <target_url> <admin_token> <backup_file>  - 向目标服务器导入数据"
    echo "  $0 migrate <source_url> <target_url> <source_token> <target_token>  - 完整迁移"
    echo ""
    echo "示例:"
    echo "  $0 export http://localhost:8080 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    echo "  $0 import http://newserver:8080 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... backup.json"
    echo "  $0 migrate http://old:8080 http://new:8080 old_token new_token"
}

# 创建备份目录
create_backup_dir() {
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$TEMP_DIR"
}

# 导出数据
export_data() {
    local source_url=$1
    local token=$2
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$BACKUP_DIR/blog_export_${timestamp}.json"
    
    echo -e "${YELLOW}正在从 $source_url 导出数据...${NC}"
    
    curl -H "Authorization: Bearer $token" \
         -H "Accept: application/json" \
         -o "$backup_file" \
         "$source_url/api/admin/export"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}数据导出成功: $backup_file${NC}"
        echo "$backup_file"
    else
        echo -e "${RED}数据导出失败${NC}"
        exit 1
    fi
}

# 导入数据
import_data() {
    local target_url=$1
    local token=$2
    local backup_file=$3
    local clear_existing=${4:-false}
    
    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}备份文件不存在: $backup_file${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}正在向 $target_url 导入数据...${NC}"
    
    response=$(curl -X POST \
                    -H "Authorization: Bearer $token" \
                    -F "file=@$backup_file" \
                    -F "clear_existing=$clear_existing" \
                    -F "merge_mode=true" \
                    -w "%{http_code}" \
                    -s -o "$TEMP_DIR/import_response.json" \
                    "$target_url/api/admin/import")
    
    if [ "$response" -eq 200 ]; then
        echo -e "${GREEN}数据导入成功${NC}"
        cat "$TEMP_DIR/import_response.json" | jq .
    else
        echo -e "${RED}数据导入失败 (HTTP $response)${NC}"
        cat "$TEMP_DIR/import_response.json"
        exit 1
    fi
}

# 获取数据库信息
get_database_info() {
    local url=$1
    local token=$2
    
    echo -e "${YELLOW}获取数据库信息...${NC}"
    
    curl -H "Authorization: Bearer $token" \
         -H "Accept: application/json" \
         "$url/api/admin/database/info" | jq .
}

# 完整迁移
full_migrate() {
    local source_url=$1
    local target_url=$2
    local source_token=$3
    local target_token=$4
    
    echo -e "${GREEN}开始完整数据迁移${NC}"
    echo "源服务器: $source_url"
    echo "目标服务器: $target_url"
    echo ""
    
    # 获取源数据库信息
    echo -e "${YELLOW}=== 源数据库信息 ===${NC}"
    get_database_info "$source_url" "$source_token"
    echo ""
    
    # 导出数据
    backup_file=$(export_data "$source_url" "$source_token")
    echo ""
    
    # 获取目标数据库信息
    echo -e "${YELLOW}=== 目标数据库信息 (导入前) ===${NC}"
    get_database_info "$target_url" "$target_token"
    echo ""
    
    # 询问是否清除目标数据库现有数据
    echo -e "${YELLOW}是否清除目标数据库的现有数据? (y/N):${NC}"
    read -r clear_choice
    clear_existing="false"
    if [[ $clear_choice =~ ^[Yy]$ ]]; then
        clear_existing="true"
        echo -e "${YELLOW}将清除目标数据库现有数据${NC}"
    fi
    echo ""
    
    # 导入数据
    import_data "$target_url" "$target_token" "$backup_file" "$clear_existing"
    echo ""
    
    # 获取目标数据库信息 (导入后)
    echo -e "${YELLOW}=== 目标数据库信息 (导入后) ===${NC}"
    get_database_info "$target_url" "$target_token"
    echo ""
    
    echo -e "${GREEN}迁移完成!${NC}"
}

# 主程序
main() {
    case "$1" in
        "export")
            if [ $# -ne 3 ]; then
                echo -e "${RED}错误: export 命令需要 2 个参数${NC}"
                show_help
                exit 1
            fi
            create_backup_dir
            export_data "$2" "$3"
            ;;
        "import")
            if [ $# -ne 4 ]; then
                echo -e "${RED}错误: import 命令需要 3 个参数${NC}"
                show_help
                exit 1
            fi
            create_backup_dir
            import_data "$2" "$3" "$4"
            ;;
        "migrate")
            if [ $# -ne 5 ]; then
                echo -e "${RED}错误: migrate 命令需要 4 个参数${NC}"
                show_help
                exit 1
            fi
            create_backup_dir
            full_migrate "$2" "$3" "$4" "$5"
            ;;
        "info")
            if [ $# -ne 3 ]; then
                echo -e "${RED}错误: info 命令需要 2 个参数${NC}"
                show_help
                exit 1
            fi
            get_database_info "$2" "$3"
            ;;
        *)
            show_help
            exit 1
            ;;
    esac
}

# 检查依赖
if ! command -v curl &> /dev/null; then
    echo -e "${RED}错误: 需要安装 curl${NC}"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}警告: 建议安装 jq 以获得更好的 JSON 输出格式${NC}"
fi

main "$@"
