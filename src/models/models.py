from sqlalchemy import Column, Integer, String, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

Base = declarative_base()


class IssueStatusEnum(str, enum.Enum):
    NEW = "New"
    IN_PROGRESS = "In Progress"
    DONE = "Done"


class SprintStatusEnum(str, enum.Enum):
    PLANNED = "Planned"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"


class RoleEnum(str, enum.Enum):
    DEVELOPER = "Developer"
    SCRUM_MASTER = "Scrum Master"
    PRODUCT_OWNER = "Product Owner"


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)  # Пароль будет храниться в зашифрованном виде
    role = Column(Enum(RoleEnum), default=RoleEnum.DEVELOPER)

    projects = relationship("Project", secondary="user_project_association")
    tasks = relationship("Issue", back_populates="assignee")


class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    description = Column(String)

    sprints = relationship("Sprint", back_populates="project")
    users = relationship("User", secondary="user_project_association")


class UserProjectAssociation(Base):
    __tablename__ = "user_project_association"
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)


class Sprint(Base):
    __tablename__ = "sprints"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    name = Column(String)
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime)
    status = Column(Enum(SprintStatusEnum), default=SprintStatusEnum.PLANNED)

    project = relationship("Project", back_populates="sprints")
    issues = relationship("Issue", back_populates="sprint")


class Issue(Base):
    __tablename__ = "issues"
    
    id = Column(Integer, primary_key=True, index=True)
    sprint_id = Column(Integer, ForeignKey("sprints.id"))
    assignee_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    description = Column(String)
    status = Column(Enum(IssueStatusEnum), default=IssueStatusEnum.NEW)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sprint = relationship("Sprint", back_populates="issues")
    assignee = relationship("User", back_populates="tasks")
