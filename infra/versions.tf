terraform {
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.13"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

provider "github" {
  owner = "jackrhoa"
}

provider "cloudflare" {}
