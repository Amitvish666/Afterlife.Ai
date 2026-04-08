"""
Storage service for S3 operations
"""

import logging
from typing import Tuple
import boto3
from botocore.config import Config

from app.core.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    """Service for S3 storage operations"""
    
    def __init__(self):
        self.s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
            config=Config(signature_version="s3v4"),
        )
        self.bucket = settings.AWS_S3_BUCKET
    
    async def upload_file(
        self,
        file,
        s3_key: str,
    ) -> int:
        """Upload a file to S3"""
        try:
            file_size = 0
            content = await file.read()
            file_size = len(content)
            
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=s3_key,
                Body=content,
                ContentType=file.content_type or "application/octet-stream",
            )
            
            return file_size
            
        except Exception as e:
            logger.exception(f"S3 upload error: {e}")
            raise
    
    async def get_file(self, s3_key: str) -> bytes:
        """Get a file from S3"""
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket,
                Key=s3_key,
            )
            return response["Body"].read()
            
        except Exception as e:
            logger.exception(f"S3 download error: {e}")
            raise
    
    def get_presigned_upload_url(
        self,
        s3_key: str,
        content_type: str,
        expires: int = 3600,
    ) -> Tuple[str, dict]:
        """Get presigned URL for upload"""
        try:
            presigned_url = self.s3_client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": self.bucket,
                    "Key": s3_key,
                    "ContentType": content_type,
                },
                ExpiresIn=expires,
            )
            
            return presigned_url, {"key": s3_key, "Content-Type": content_type}
            
        except Exception as e:
            logger.exception(f"S3 presigned URL error: {e}")
            raise
    
    def get_presigned_download_url(
        self,
        s3_key: str,
        expires: int = 3600,
    ) -> str:
        """Get presigned URL for download"""
        try:
            presigned_url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": self.bucket,
                    "Key": s3_key,
                },
                ExpiresIn=expires,
            )
            return presigned_url
            
        except Exception as e:
            logger.exception(f"S3 download URL error: {e}")
            raise
    
    async def delete_file(self, s3_key: str) -> bool:
        """Delete a file from S3"""
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket,
                Key=s3_key,
            )
            return True
            
        except Exception as e:
            logger.exception(f"S3 delete error: {e}")
            return False
    
    async def copy_file(self, source_key: str, dest_key: str) -> bool:
        """Copy a file within S3"""
        try:
            self.s3_client.copy_object(
                Bucket=self.bucket,
                CopySource={"Bucket": self.bucket, "Key": source_key},
                Key=dest_key,
            )
            return True
            
        except Exception as e:
            logger.exception(f"S3 copy error: {e}")
            return False
    
    async def list_files(
        self,
        prefix: str,
        max_keys: int = 1000,
    ) -> list:
        """List files with a prefix"""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket,
                Prefix=prefix,
                MaxKeys=max_keys,
            )
            return response.get("Contents", [])
            
        except Exception as e:
            logger.exception(f"S3 list error: {e}")
            return []
