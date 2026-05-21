"""SQLAlchemy models for PodDoctor."""
from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
    Float,
)
from sqlalchemy.orm import relationship

from database.db import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    # Encrypted AWS + Groq credentials (Fernet-encrypted blob)
    aws_access_key_enc = Column(Text, nullable=True)
    aws_secret_key_enc = Column(Text, nullable=True)
    aws_region = Column(String(32), nullable=True)
    groq_api_key_enc = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    clusters = relationship("Cluster", back_populates="user", cascade="all, delete-orphan")


class Cluster(Base):
    __tablename__ = "clusters"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    name = Column(String(255), nullable=False)
    region = Column(String(32), nullable=False)
    arn = Column(String(512), nullable=True)
    endpoint = Column(String(512), nullable=True)
    version = Column(String(32), nullable=True)
    status = Column(String(32), default="discovered")  # discovered|active|disconnected
    selected = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="clusters")
    incidents = relationship("Incident", back_populates="cluster", cascade="all, delete-orphan")


class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True)
    cluster_id = Column(Integer, ForeignKey("clusters.id", ondelete="CASCADE"))
    severity = Column(String(16), default="warning")    # info|warning|critical
    status = Column(String(16), default="detected")     # detected|analyzing|remediating|resolved
    namespace = Column(String(128), nullable=True)
    resource_kind = Column(String(64), nullable=True)   # Pod, Node, Deployment...
    resource_name = Column(String(256), nullable=True)
    reason = Column(String(128), nullable=True)         # CrashLoopBackOff, OOMKilled...
    message = Column(Text, nullable=True)

    # AI fields
    root_cause = Column(Text, nullable=True)
    confidence = Column(Float, nullable=True)
    suggested_fix = Column(Text, nullable=True)

    timeline = Column(JSON, default=list)               # list of {ts, kind, message}
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    cluster = relationship("Cluster", back_populates="incidents")
    remediations = relationship("RemediationHistory", back_populates="incident", cascade="all, delete-orphan")


class RemediationHistory(Base):
    __tablename__ = "remediation_history"
    id = Column(Integer, primary_key=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=True)
    cluster_id = Column(Integer, ForeignKey("clusters.id", ondelete="CASCADE"))
    action = Column(String(64), nullable=False)         # restart_deployment|delete_pod|...
    namespace = Column(String(128), nullable=True)
    target = Column(String(256), nullable=True)
    dry_run = Column(Boolean, default=False)
    status = Column(String(32), default="pending")      # pending|running|success|failed
    result = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    incident = relationship("Incident", back_populates="remediations")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    cluster_id = Column(Integer, ForeignKey("clusters.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(128), nullable=False)
    detail = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
