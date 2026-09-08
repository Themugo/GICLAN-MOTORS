#!/bin/bash
# ─────────────────────────────────────────────────────────────
# KAYAD SSL Certificate Setup Script
# Generates self-signed certificates for development or
# provides instructions for production SSL setup
# ─────────────────────────────────────────────────────────────

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if OpenSSL is installed
check_openssl() {
    log_info "Checking OpenSSL installation..."
    if ! command -v openssl &> /dev/null; then
        log_error "OpenSSL is not installed. Please install OpenSSL first."
        exit 1
    fi
    log_info "OpenSSL is installed: $(openssl version)"
}

# Create SSL directory
create_ssl_directory() {
    log_step "Creating SSL directory..."
    mkdir -p nginx/ssl
    log_info "SSL directory created: nginx/ssl"
}

# Generate self-signed certificate for development
generate_self_signed_cert() {
    log_step "Generating self-signed SSL certificate for development..."

    DOMAIN=${1:-api.kayad.space}

    if [ -f "nginx/ssl/cert.pem" ] && [ -f "nginx/ssl/key.pem" ]; then
        log_warn "SSL certificates already exist. Skipping generation."
        log_warn "To regenerate, remove nginx/ssl/cert.pem and nginx/ssl/key.pem"
        return
    fi

    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=KE/ST=Nairobi/L=Nairobi/O=KAYAD/OU=IT/CN=${DOMAIN}"

    chmod 600 nginx/ssl/key.pem
    chmod 644 nginx/ssl/cert.pem

    log_info "Self-signed SSL certificate generated successfully"
    log_info "Certificate: nginx/ssl/cert.pem"
    log_info "Private Key: nginx/ssl/key.pem"
    log_warn "This is a self-signed certificate for development only!"
    log_warn "Browsers will show security warnings. Use Let's Encrypt for production."
}

# Generate certificate with CSR for production
generate_csr() {
    log_step "Generating Certificate Signing Request (CSR) for production..."

    DOMAIN=${1:-api.kayad.space}
    COUNTRY=${2:-KE}
    STATE=${3:-Nairobi}
    CITY=${4:-Nairobi}
    ORGANIZATION=${5:-KAYAD}
    ORGANIZATIONAL_UNIT=${6:-IT}

    # Generate private key
    openssl genrsa -out nginx/ssl/private.key 2048

    # Generate CSR
    openssl req -new -key nginx/ssl/private.key -out nginx/ssl/certificate.csr \
        -subj "/C=${COUNTRY}/ST=${STATE}/L=${CITY}/O=${ORGANIZATION}/OU=${ORGANIZATIONAL_UNIT}/CN=${DOMAIN}"

    chmod 600 nginx/ssl/private.key
    chmod 644 nginx/ssl/certificate.csr

    log_info "CSR generated successfully"
    log_info "Private Key: nginx/ssl/private.key"
    log_info "CSR: nginx/ssl/certificate.csr"
    log_warn "Submit the CSR to your SSL provider to get the signed certificate"
}

# Setup Let's Encrypt with Certbot
setup_letsencrypt() {
    log_step "Setting up Let's Encrypt SSL certificates..."

    DOMAIN=${1:-api.kayad.space}
    EMAIL=${2:-admin@kayad.space}

    log_info "Prerequisites for Let's Encrypt:"
    log_info "1. Domain must be pointing to your server"
    log_info "2. Port 80 must be open and accessible"
    log_info "3. Certbot must be installed"
    echo ""

    log_info "Install Certbot:"
    log_info "Ubuntu/Debian: sudo apt-get install certbot"
    log_info "CentOS/RHEL: sudo yum install certbot"
    echo ""

    log_info "Generate certificate:"
    log_info "sudo certbot certonly --standalone -d ${DOMAIN} --email ${EMAIL} --agree-tos"
    echo ""

    log_info "Certificate location:"
    log_info "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
    log_info "/etc/letsencrypt/live/${DOMAIN}/privkey.pem"
    echo ""

    log_info "Copy certificates to nginx/ssl:"
    log_info "sudo cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem nginx/ssl/cert.pem"
    log_info "sudo cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem nginx/ssl/key.pem"
    echo ""

    log_info "Setup auto-renewal:"
    log_info "sudo certbot renew --dry-run"
    log_info "Add to crontab: 0 0 * * 0 certbot renew --quiet"
}

# Verify certificate
verify_certificate() {
    log_step "Verifying SSL certificate..."

    if [ ! -f "nginx/ssl/cert.pem" ]; then
        log_error "Certificate file not found: nginx/ssl/cert.pem"
        exit 1
    fi

    if [ ! -f "nginx/ssl/key.pem" ]; then
        log_error "Private key file not found: nginx/ssl/key.pem"
        exit 1
    fi

    openssl x509 -in nginx/ssl/cert.pem -text -noout | head -20

    log_info "Certificate verification completed"
}

# Display certificate info
display_certificate_info() {
    log_step "Displaying SSL certificate information..."

    if [ -f "nginx/ssl/cert.pem" ]; then
        openssl x509 -in nginx/ssl/cert.pem -text -noout
    else
        log_error "Certificate file not found"
    fi
}

# Update NGINX configuration
update_nginx_config() {
    log_step "Updating NGINX configuration..."

    DOMAIN=${1:-api.kayad.space}

    log_info "Make sure nginx/nginx.conf has the correct domain: ${DOMAIN}"
    log_info "Update server_name directive in nginx/nginx.conf"
    log_info "server_name ${DOMAIN};"
}

# Main function
main() {
    case "${1:-help}" in
        dev)
            log_info "Setting up SSL for development..."
            check_openssl
            create_ssl_directory
            generate_self_signed_cert ${2:-api.kayad.space}
            verify_certificate
            log_info "Development SSL setup completed"
            ;;
        csr)
            log_info "Generating CSR for production..."
            check_openssl
            create_ssl_directory
            generate_csr "$2" "$3" "$4" "$5" "$6" "$7"
            log_info "CSR generation completed"
            ;;
        letsencrypt)
            log_info "Let's Encrypt setup instructions..."
            setup_letsencrypt "$2" "$3"
            ;;
        verify)
            log_info "Verifying SSL certificate..."
            verify_certificate
            ;;
        info)
            log_info "Displaying certificate information..."
            display_certificate_info
            ;;
        update-nginx)
            log_info "Updating NGINX configuration..."
            update_nginx_config "$2"
            ;;
        help)
            echo "KAYAD SSL Certificate Setup Script"
            echo ""
            echo "Usage: $0 {dev|csr|letsencrypt|verify|info|update-nginx} [options]"
            echo ""
            echo "Commands:"
            echo "  dev [domain]              Generate self-signed certificate for development"
            echo "  csr [domain] [country] [state] [city] [org] [ou]"
            echo "                            Generate Certificate Signing Request for production"
            echo "  letsencrypt [domain] [email]"
            echo "                            Display Let's Encrypt setup instructions"
            echo "  verify                    Verify SSL certificate"
            echo "  info                      Display certificate information"
            echo "  update-nginx [domain]     Display NGINX configuration update instructions"
            echo ""
            echo "Examples:"
            echo "  $0 dev api.kayad.space"
            echo "  $0 csr api.kayad.space KE Nairobi Nairobi KAYAD IT"
            echo "  $0 letsencrypt api.kayad.space admin@kayad.space"
            echo "  $0 verify"
            echo "  $0 info"
            ;;
        *)
            log_error "Invalid command. Use 'help' for usage information."
            exit 1
            ;;
    esac
}

main "$@"
