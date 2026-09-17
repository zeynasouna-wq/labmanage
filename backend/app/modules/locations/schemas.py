from pydantic import BaseModel


class LocationCreate(BaseModel):
    name: str
    description: str | None = None
    temperature_controlled: bool = False


class LocationUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    temperature_controlled: bool | None = None


class LocationResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    temperature_controlled: bool

    model_config = {"from_attributes": True}
