import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type {
  CreateRoomRequest,
  LinkCharacterRequest,
  RoomCharacterInfo,
  RoomConfig,
  RoomDetail,
  UpdateRoomCharacterRequest,
} from '@vampiro/shared';
import type { Observable } from 'rxjs';

const URL = '/api/v1/rooms';

/** Escrituras de salas. Las lecturas de las pantallas usan httpResource. */
@Service()
export class RoomsApi {
  private readonly http = inject(HttpClient);

  create(body: CreateRoomRequest): Observable<RoomDetail> {
    return this.http.post<RoomDetail>(URL, body);
  }

  join(code: string): Observable<RoomDetail> {
    return this.http.post<RoomDetail>(`${URL}/join`, { code });
  }

  updateConfig(roomId: string, config: RoomConfig): Observable<RoomDetail> {
    return this.http.patch<RoomDetail>(`${URL}/${roomId}/config`, config);
  }

  regenerateInvite(
    roomId: string,
    expiresInHours?: number,
  ): Observable<{ code: string; expiresAt?: string }> {
    return this.http.post<{ code: string; expiresAt?: string }>(
      `${URL}/${roomId}/invite-code`,
      expiresInHours ? { expiresInHours } : {},
    );
  }

  removeMember(roomId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${URL}/${roomId}/members/${userId}`);
  }

  linkCharacter(roomId: string, body: LinkCharacterRequest): Observable<RoomCharacterInfo> {
    return this.http.post<RoomCharacterInfo>(`${URL}/${roomId}/characters`, body);
  }

  updateCharacter(
    roomId: string,
    linkId: string,
    body: UpdateRoomCharacterRequest,
  ): Observable<RoomCharacterInfo> {
    return this.http.patch<RoomCharacterInfo>(`${URL}/${roomId}/characters/${linkId}`, body);
  }

  unlinkCharacter(roomId: string, linkId: string): Observable<void> {
    return this.http.delete<void>(`${URL}/${roomId}/characters/${linkId}`);
  }
}
